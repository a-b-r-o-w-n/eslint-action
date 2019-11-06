declare namespace NodeJS {
  export interface ProcessEnv {
    GITHUB_ACTION: string;
    GITHUB_WORKSPACE: string;
  }
}

interface PrResponse {
  endCursor?: string;
  hasNextPage?: boolean;
  files: string[];
}
