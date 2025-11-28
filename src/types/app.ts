export interface ClusterConnection {
  id: string;
  label: string;
  baseUrl: string;
  username: string;
  password: string;
}

export interface CreateClusterInput {
  label: string;
  baseUrl: string;
  username?: string;
  password?: string;
}

