/**
 * Tipos TypeScript do banco de dados Supabase para a Liga OBA.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      bladers: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          nickname: string;
          city: string | null;
          avatar_url: string | null;
          bio: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          nickname: string;
          city?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          name?: string;
          nickname?: string;
          city?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bladers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      tournaments: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          location: string | null;
          event_date: string;
          format: "swiss" | "single_elim" | "double_elim";
          status: "draft" | "open" | "ongoing" | "finished";
          max_players: number | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          location?: string | null;
          event_date: string;
          format: "swiss" | "single_elim" | "double_elim";
          status?: "draft" | "open" | "ongoing" | "finished";
          max_players?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          location?: string | null;
          event_date?: string;
          format?: "swiss" | "single_elim" | "double_elim";
          status?: "draft" | "open" | "ongoing" | "finished";
          max_players?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tournaments_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      tournament_results: {
        Row: {
          id: string;
          tournament_id: string;
          blader_id: string;
          final_position: number;
          points_earned: number;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          blader_id: string;
          final_position: number;
          points_earned?: number;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          blader_id?: string;
          final_position?: number;
          points_earned?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tournament_results_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tournament_results_blader_id_fkey";
            columns: ["blader_id"];
            isOneToOne: false;
            referencedRelation: "bladers";
            referencedColumns: ["id"];
          }
        ];
      };
      ranking: {
        Row: {
          id: string;
          blader_id: string;
          total_points: number;
          tournaments_played: number;
          best_position: number | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          blader_id: string;
          total_points?: number;
          tournaments_played?: number;
          best_position?: number | null;
          updated_at?: string;
        };
        Update: {
          id?: string;
          blader_id?: string;
          total_points?: number;
          tournaments_played?: number;
          best_position?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ranking_blader_id_fkey";
            columns: ["blader_id"];
            isOneToOne: true;
            referencedRelation: "bladers";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      tournament_format: "swiss" | "single_elim" | "double_elim";
      tournament_status: "draft" | "open" | "ongoing" | "finished";
    };
    CompositeTypes: Record<string, never>;
  };
};
