import crypto from "crypto";

const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || "";

export interface GitHubPushEvent {
  ref: string;
  before: string;
  after: string;
  repository: {
    id: number;
    name: string;
    full_name: string;
    clone_url: string;
    html_url: string;
  };
  pusher: {
    name: string;
    email: string;
  };
  head_commit: {
    id: string;
    message: string;
    timestamp: string;
    author: {
      name: string;
      email: string;
    };
  } | null;
}

export interface GitHubPullRequestEvent {
  action: string;
  number: number;
  pull_request: {
    id: number;
    number: number;
    state: string;
    title: string;
    head: {
      ref: string;
      sha: string;
    };
    base: {
      ref: string;
    };
    merged: boolean;
  };
  repository: {
    id: number;
    name: string;
    full_name: string;
    clone_url: string;
  };
}

// Verify webhook signature from GitHub
export function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret?: string
): boolean {
  if (!signature) {
    return false;
  }

  const webhookSecret = secret || GITHUB_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.warn("No webhook secret configured");
    return false;
  }

  const hmac = crypto.createHmac("sha256", webhookSecret);
  const digest = `sha256=${hmac.update(payload).digest("hex")}`;

  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

// Parse GitHub push event
export function parsePushEvent(payload: GitHubPushEvent) {
  const branch = payload.ref.replace("refs/heads/", "");

  return {
    branch,
    commitHash: payload.after,
    commitMessage: payload.head_commit?.message || "",
    repoUrl: payload.repository.clone_url,
    repoFullName: payload.repository.full_name,
    pusher: payload.pusher.name,
  };
}

// Parse GitHub pull request event
export function parsePullRequestEvent(payload: GitHubPullRequestEvent) {
  return {
    action: payload.action,
    number: payload.number,
    branch: payload.pull_request.head.ref,
    baseBranch: payload.pull_request.base.ref,
    commitHash: payload.pull_request.head.sha,
    title: payload.pull_request.title,
    merged: payload.pull_request.merged,
    repoUrl: payload.repository.clone_url,
    repoFullName: payload.repository.full_name,
  };
}

// Generate a random webhook secret
export function generateWebhookSecret(): string {
  return crypto.randomBytes(32).toString("hex");
}

// Extract repo owner and name from GitHub URL
export function parseGitHubUrl(url: string): {
  owner: string;
  repo: string;
} | null {
  // Handle various GitHub URL formats
  const patterns = [
    /github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?$/,
    /^([^/]+)\/([^/]+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
    }
  }

  return null;
}

// Check if a repo URL matches
export function repoUrlMatches(configuredUrl: string, eventUrl: string): boolean {
  const configured = parseGitHubUrl(configuredUrl);
  const event = parseGitHubUrl(eventUrl);

  if (!configured || !event) {
    return false;
  }

  return (
    configured.owner.toLowerCase() === event.owner.toLowerCase() &&
    configured.repo.toLowerCase() === event.repo.toLowerCase()
  );
}
