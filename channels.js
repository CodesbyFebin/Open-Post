/**
 * Open Post - Platform Drivers & Dispatchers
 * Reverse-engineered from Postiz channel adapters without multi-tier microservice dependencies.
 */

class ChannelDispatcher {
  constructor(config = {}) {
    this.config = config;
  }

  /**
   * Universal Dispatch Entry Point
   */
  async publish(channel, post) {
    console.log(`[Open Post Dispatcher] Publishing post ${post.id} to ${channel.type} (${channel.name})`);
    
    // In dry-run or unconfigured mode, simulate successful post
    if (this.config.DRY_RUN || !channel.credentials || channel.credentials.mock) {
      return this.simulatePublish(channel, post);
    }

    switch (channel.type.toLowerCase()) {
      case 'twitter':
      case 'x':
        return this.publishTwitter(channel, post);
      case 'linkedin':
        return this.publishLinkedIn(channel, post);
      case 'reddit':
        return this.publishReddit(channel, post);
      case 'bluesky':
        return this.publishBluesky(channel, post);
      case 'webhook':
        return this.publishWebhook(channel, post);
      default:
        throw new Error(`Unsupported channel type: ${channel.type}`);
    }
  }

  simulatePublish(channel, post) {
    const mockPostId = `mock_${channel.type}_${Date.now()}`;
    const mockUrl = `https://${channel.type}.com/post/${mockPostId}`;
    return {
      success: true,
      simulated: true,
      remoteId: mockPostId,
      url: mockUrl,
      publishedAt: new Date().toISOString()
    };
  }

  /**
   * Twitter / X API v2 Dispatcher
   */
  async publishTwitter(channel, post) {
    const { apiKey, apiSecret, accessToken, accessSecret, bearerToken } = channel.credentials;
    const content = post.platformOverrides?.twitter?.content || post.content;

    // Use fetch to hit Twitter API v2 /2/tweets
    const response = await fetch('https://api.twitter.com/2/tweets', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bearerToken || accessToken}`
      },
      body: JSON.stringify({
        text: content.slice(0, 280)
      })
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Twitter API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return {
      success: true,
      remoteId: data.data?.id,
      url: `https://x.com/i/status/${data.data?.id}`,
      publishedAt: new Date().toISOString()
    };
  }

  /**
   * LinkedIn UGC / Share API Dispatcher
   */
  async publishLinkedIn(channel, post) {
    const { accessToken, authorUrn } = channel.credentials;
    const content = post.platformOverrides?.linkedin?.content || post.content;

    const payload = {
      author: authorUrn, // e.g. "urn:li:person:XXXX" or "urn:li:organization:XXXX"
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: content
          },
          shareMediaCategory: 'NONE'
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`LinkedIn API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    return {
      success: true,
      remoteId: data.id,
      url: `https://www.linkedin.com/feed/update/${data.id}`,
      publishedAt: new Date().toISOString()
    };
  }

  /**
   * Reddit Submit API Dispatcher
   */
  async publishReddit(channel, post) {
    const { accessToken, subreddit } = channel.credentials;
    const title = post.platformOverrides?.reddit?.title || post.content.split('\n')[0].slice(0, 100);
    const body = post.platformOverrides?.reddit?.content || post.content;

    const params = new URLSearchParams({
      api_type: 'json',
      kind: 'self',
      sr: subreddit || 'test',
      title: title,
      text: body
    });

    const response = await fetch('https://oauth.reddit.com/api/submit', {
      method: 'POST',
      headers: {
        'Authorization': `bearer ${accessToken}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'OpenPost/1.0.0'
      },
      body: params.toString()
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Reddit API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const postData = data.json?.data;
    return {
      success: true,
      remoteId: postData?.id,
      url: postData?.url,
      publishedAt: new Date().toISOString()
    };
  }

  /**
   * Bluesky AT Protocol Dispatcher
   */
  async publishBluesky(channel, post) {
    const { identifier, password, service = 'https://bsky.social' } = channel.credentials;
    const content = post.platformOverrides?.bluesky?.content || post.content;

    // Create session
    const sessionRes = await fetch(`${service}/xrpc/com.atproto.server.createSession`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });

    if (!sessionRes.ok) {
      throw new Error(`Bluesky auth failed: ${sessionRes.statusText}`);
    }

    const session = await sessionRes.json();

    // Create record
    const record = {
      $type: 'app.bsky.feed.post',
      text: content.slice(0, 300),
      createdAt: new Date().toISOString()
    };

    const postRes = await fetch(`${service}/xrpc/com.atproto.repo.createRecord`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.accessJwt}`
      },
      body: JSON.stringify({
        repo: session.did,
        collection: 'app.bsky.feed.post',
        record
      })
    });

    if (!postRes.ok) {
      const err = await postRes.text();
      throw new Error(`Bluesky post error: ${err}`);
    }

    const postData = await postRes.json();
    return {
      success: true,
      remoteId: postData.uri,
      url: `https://bsky.app/profile/${session.handle}/post/${postData.uri.split('/').pop()}`,
      publishedAt: new Date().toISOString()
    };
  }

  /**
   * Custom Webhook Dispatcher (n8n, Make, Zapier, Custom Server)
   */
  async publishWebhook(channel, post) {
    const { url, secret } = channel.credentials;
    if (!url) throw new Error('Webhook URL missing');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Open-Post-Secret': secret || '',
        'X-Open-Post-Event': 'post.published'
      },
      body: JSON.stringify({
        event: 'publish',
        channel: { id: channel.id, name: channel.name, type: channel.type },
        post: {
          id: post.id,
          content: post.content,
          tags: post.tags,
          mediaUrls: post.mediaUrls,
          scheduledFor: post.scheduledFor,
          publishedAt: new Date().toISOString()
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Webhook dispatch failed with HTTP ${response.status}`);
    }

    return {
      success: true,
      remoteId: `webhook_${Date.now()}`,
      url: url,
      publishedAt: new Date().toISOString()
    };
  }
}

module.exports = { ChannelDispatcher };
