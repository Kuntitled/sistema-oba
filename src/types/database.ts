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
      seasons: {
        Row: {
          id: string;
          year: number;
          name: string;
          starts_at: string;
          ends_at: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          year: number;
          name: string;
          starts_at: string;
          ends_at: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          year?: number;
          name?: string;
          starts_at?: string;
          ends_at?: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
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
          season_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          location: string | null;
          event_date: string;
          category: "semanal" | "oficial";
          format:
            | "swiss_top_cut"
            | "swiss_only"
            | "swiss"
            | "single_elim"
            | "double_elim";
          swiss_rounds: number;
          top_cut_size: number | null;
          status: "draft" | "open" | "ongoing" | "finished";
          max_players: number | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          location?: string | null;
          event_date: string;
          category?: "semanal" | "oficial";
          format?:
            | "swiss_top_cut"
            | "swiss_only"
            | "swiss"
            | "single_elim"
            | "double_elim";
          swiss_rounds?: number;
          top_cut_size?: number | null;
          status?: "draft" | "open" | "ongoing" | "finished";
          max_players?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string | null;
          name?: string;
          slug?: string;
          description?: string | null;
          location?: string | null;
          event_date?: string;
          category?: "semanal" | "oficial";
          format?:
            | "swiss_top_cut"
            | "swiss_only"
            | "swiss"
            | "single_elim"
            | "double_elim";
          swiss_rounds?: number;
          top_cut_size?: number | null;
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
          },
          {
            foreignKeyName: "tournaments_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          }
        ];
      };
      tournament_participants: {
        Row: {
          id: string;
          tournament_id: string;
          blader_id: string;
          seed: number | null;
          is_dropped: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          blader_id: string;
          seed?: number | null;
          is_dropped?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          blader_id?: string;
          seed?: number | null;
          is_dropped?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tournament_participants_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tournament_participants_blader_id_fkey";
            columns: ["blader_id"];
            isOneToOne: false;
            referencedRelation: "bladers";
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
          swiss_wins: number;
          swiss_points: number;
          is_swiss_leader: boolean;
          swiss_leader_bonus: number;
          podium_points: number;
          points_earned: number;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          blader_id: string;
          final_position: number;
          swiss_wins?: number;
          swiss_points?: number;
          is_swiss_leader?: boolean;
          swiss_leader_bonus?: number;
          podium_points?: number;
          points_earned?: number;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          blader_id?: string;
          final_position?: number;
          swiss_wins?: number;
          swiss_points?: number;
          is_swiss_leader?: boolean;
          swiss_leader_bonus?: number;
          podium_points?: number;
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
          season_id: string;
          blader_id: string;
          total_points: number;
          tournaments_played: number;
          swiss_wins: number;
          podiums_count: number;
          first_places: number;
          second_places: number;
          third_places: number;
          best_podium: number | null;
          best_position: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id: string;
          blader_id: string;
          total_points?: number;
          tournaments_played?: number;
          swiss_wins?: number;
          podiums_count?: number;
          first_places?: number;
          second_places?: number;
          third_places?: number;
          best_podium?: number | null;
          best_position?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string;
          blader_id?: string;
          total_points?: number;
          tournaments_played?: number;
          swiss_wins?: number;
          podiums_count?: number;
          first_places?: number;
          second_places?: number;
          third_places?: number;
          best_podium?: number | null;
          best_position?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ranking_blader_id_fkey";
            columns: ["blader_id"];
            isOneToOne: false;
            referencedRelation: "bladers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ranking_season_id_fkey";
            columns: ["season_id"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          }
        ];
      };
      arenas: {
        Row: {
          id: string;
          tournament_id: string;
          name: string;
          display_order: number;
          status: "available" | "in_match" | "maintenance";
          current_match_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          name: string;
          display_order?: number;
          status?: "available" | "in_match" | "maintenance";
          current_match_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          name?: string;
          display_order?: number;
          status?: "available" | "in_match" | "maintenance";
          current_match_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "arenas_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "arenas_current_match_id_fkey";
            columns: ["current_match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          }
        ];
      };
      matches: {
        Row: {
          id: string;
          tournament_id: string;
          arena_id: string | null;
          round: number;
          match_number: number;
          stage: "swiss" | "top_cut";
          bracket_label: string | null;
          player1_id: string | null;
          player2_id: string | null;
          player1_score: number;
          player2_score: number;
          target_score: number;
          winner_id: string | null;
          status: "pending" | "in_progress" | "finished" | "cancelled";
          is_bye: boolean;
          is_tiebreaker: boolean;
          next_match_id: string | null;
          next_match_slot: number | null;
          loser_next_match_id: string | null;
          loser_next_match_slot: number | null;
          started_at: string | null;
          finished_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          arena_id?: string | null;
          round?: number;
          match_number?: number;
          stage?: "swiss" | "top_cut";
          bracket_label?: string | null;
          player1_id?: string | null;
          player2_id?: string | null;
          player1_score?: number;
          player2_score?: number;
          target_score?: number;
          winner_id?: string | null;
          status?: "pending" | "in_progress" | "finished" | "cancelled";
          is_bye?: boolean;
          is_tiebreaker?: boolean;
          next_match_id?: string | null;
          next_match_slot?: number | null;
          loser_next_match_id?: string | null;
          loser_next_match_slot?: number | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          arena_id?: string | null;
          round?: number;
          match_number?: number;
          stage?: "swiss" | "top_cut";
          bracket_label?: string | null;
          player1_id?: string | null;
          player2_id?: string | null;
          player1_score?: number;
          player2_score?: number;
          target_score?: number;
          winner_id?: string | null;
          status?: "pending" | "in_progress" | "finished" | "cancelled";
          is_bye?: boolean;
          is_tiebreaker?: boolean;
          next_match_id?: string | null;
          next_match_slot?: number | null;
          loser_next_match_id?: string | null;
          loser_next_match_slot?: number | null;
          started_at?: string | null;
          finished_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_arena_id_fkey";
            columns: ["arena_id"];
            isOneToOne: false;
            referencedRelation: "arenas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_player1_id_fkey";
            columns: ["player1_id"];
            isOneToOne: false;
            referencedRelation: "bladers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_player2_id_fkey";
            columns: ["player2_id"];
            isOneToOne: false;
            referencedRelation: "bladers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_winner_id_fkey";
            columns: ["winner_id"];
            isOneToOne: false;
            referencedRelation: "bladers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_next_match_id_fkey";
            columns: ["next_match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_loser_next_match_id_fkey";
            columns: ["loser_next_match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          }
        ];
      };
      match_games: {
        Row: {
          id: string;
          match_id: string;
          round_number: number;
          scoring_player_id: string | null;
          finish_type: "spin" | "over" | "burst" | "xtreme" | "draw";
          points_awarded: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          round_number: number;
          scoring_player_id?: string | null;
          finish_type: "spin" | "over" | "burst" | "xtreme" | "draw";
          points_awarded: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          round_number?: number;
          scoring_player_id?: string | null;
          finish_type?: "spin" | "over" | "burst" | "xtreme" | "draw";
          points_awarded?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "match_games_match_id_fkey";
            columns: ["match_id"];
            isOneToOne: false;
            referencedRelation: "matches";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_games_scoring_player_id_fkey";
            columns: ["scoring_player_id"];
            isOneToOne: false;
            referencedRelation: "bladers";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      tournament_category: "semanal" | "oficial";
      tournament_format:
        | "swiss_top_cut"
        | "swiss_only"
        | "swiss"
        | "single_elim"
        | "double_elim";
      tournament_status: "draft" | "open" | "ongoing" | "finished";
      arena_status: "available" | "in_match" | "maintenance";
      match_stage: "swiss" | "top_cut";
      match_status: "pending" | "in_progress" | "finished" | "cancelled";
      finish_type: "spin" | "over" | "burst" | "xtreme" | "draw";
    };
    CompositeTypes: Record<string, never>;
  };
};
