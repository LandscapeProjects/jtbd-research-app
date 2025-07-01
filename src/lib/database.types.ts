export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          name: string;
          description: string;
          owner_id: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          owner_id: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string;
          owner_id?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      interviews: {
        Row: {
          id: string;
          project_id: string;
          participant_name: string;
          participant_age: number | null;
          participant_gender: string | null;
          interview_date: string;
          context: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          participant_name: string;
          participant_age?: number | null;
          participant_gender?: string | null;
          interview_date?: string;
          context?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          participant_name?: string;
          participant_age?: number | null;
          participant_gender?: string | null;
          interview_date?: string;
          context?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      stories: {
        Row: {
          id: string;
          interview_id: string;
          title: string;
          description: string;
          situation_a: string;
          situation_b: string;
          cluster_id: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          interview_id: string;
          title: string;
          description: string;
          situation_a: string;
          situation_b: string;
          cluster_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          interview_id?: string;
          title?: string;
          description?: string;
          situation_a?: string;
          situation_b?: string;
          cluster_id?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      forces: {
        Row: {
          id: string;
          story_id: string;
          type: 'push' | 'pull' | 'habit' | 'anxiety';
          description: string;
          group_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          type: 'push' | 'pull' | 'habit' | 'anxiety';
          description: string;
          group_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          story_id?: string;
          type?: 'push' | 'pull' | 'habit' | 'anxiety';
          description?: string;
          group_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      force_groups: {
        Row: {
          id: string;
          project_id: string;
          name: string;
          type: 'push' | 'pull';
          color: string;
          is_leftover: boolean;
          position: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          name: string;
          type: 'push' | 'pull';
          color?: string;
          is_leftover?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          name?: string;
          type?: 'push' | 'pull';
          color?: string;
          is_leftover?: boolean;
          position?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      story_group_matrix: {
        Row: {
          id: string;
          story_id: string;
          group_id: string;
          matches: boolean | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          story_id: string;
          group_id: string;
          matches?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          story_id?: string;
          group_id?: string;
          matches?: boolean | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Project = Database['public']['Tables']['projects']['Row'];
export type Interview = Database['public']['Tables']['interviews']['Row'];
export type Story = Database['public']['Tables']['stories']['Row'];
export type Force = Database['public']['Tables']['forces']['Row'];
export type ForceGroup = Database['public']['Tables']['force_groups']['Row'];
export type MatrixEntry = Database['public']['Tables']['story_group_matrix']['Row'];

export type ForceType = 'push' | 'pull' | 'habit' | 'anxiety';
export type GroupType = 'push' | 'pull';