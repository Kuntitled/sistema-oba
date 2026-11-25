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
          favorite_anime: string | null;
          favorite_system: "BX" | "BXE" | "UX" | "UXE" | "CX" | "CXE" | null;
          favorite_blade_id: string | null;
          favorite_lock_chip_id: string | null;
          favorite_over_blade_id: string | null;
          favorite_assist_blade_id: string | null;
          favorite_ratchet_id: string | null;
          favorite_bit_id: string | null;
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
          favorite_anime?: string | null;
          favorite_system?: "BX" | "BXE" | "UX" | "UXE" | "CX" | "CXE" | null;
          favorite_blade_id?: string | null;
          favorite_lock_chip_id?: string | null;
          favorite_over_blade_id?: string | null;
          favorite_assist_blade_id?: string | null;
          favorite_ratchet_id?: string | null;
          favorite_bit_id?: string | null;
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
          favorite_anime?: string | null;
          favorite_system?: "BX" | "BXE" | "UX" | "UXE" | "CX" | "CXE" | null;
          favorite_blade_id?: string | null;
          favorite_lock_chip_id?: string | null;
          favorite_over_blade_id?: string | null;
          favorite_assist_blade_id?: string | null;
          favorite_ratchet_id?: string | null;
          favorite_bit_id?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bladers_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bladers_favorite_blade_id_fkey";
            columns: ["favorite_blade_id"];
            isOneToOne: false;
            referencedRelation: "parts_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bladers_favorite_lock_chip_id_fkey";
            columns: ["favorite_lock_chip_id"];
            isOneToOne: false;
            referencedRelation: "parts_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bladers_favorite_over_blade_id_fkey";
            columns: ["favorite_over_blade_id"];
            isOneToOne: false;
            referencedRelation: "parts_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bladers_favorite_assist_blade_id_fkey";
            columns: ["favorite_assist_blade_id"];
            isOneToOne: false;
            referencedRelation: "parts_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bladers_favorite_ratchet_id_fkey";
            columns: ["favorite_ratchet_id"];
            isOneToOne: false;
            referencedRelation: "parts_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "bladers_favorite_bit_id_fkey";
            columns: ["favorite_bit_id"];
            isOneToOne: false;
            referencedRelation: "parts_catalog";
            referencedColumns: ["id"];
          }
        ];
      };
      tournaments: {
        Row: {
          id: string;
          season_id: string | null;
          ruleset_id: string | null;
          name: string;
          slug: string;
          description: string | null;
          location: string | null;
          location_url: string | null;
          event_date: string;
          event_time: string | null;
          prize_info: string | null;
          category: "semanal" | "oficial" | "amistoso";
          format:
            | "swiss_top_cut"
            | "swiss_only"
            | "swiss"
            | "single_elim"
            | "double_elim";
          swiss_rounds: number;
          top_cut_size: number | null;
          status: "draft" | "open" | "ongoing" | "finished";
          registration_status: "closed" | "open" | "finished";
          entry_fee: number | null;
          max_players: number | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          season_id?: string | null;
          ruleset_id?: string | null;
          name: string;
          slug: string;
          description?: string | null;
          location?: string | null;
          location_url?: string | null;
          event_date: string;
          event_time?: string | null;
          prize_info?: string | null;
          category?: "semanal" | "oficial" | "amistoso";
          format?:
            | "swiss_top_cut"
            | "swiss_only"
            | "swiss"
            | "single_elim"
            | "double_elim";
          swiss_rounds?: number;
          top_cut_size?: number | null;
          status?: "draft" | "open" | "ongoing" | "finished";
          registration_status?: "closed" | "open" | "finished";
          entry_fee?: number | null;
          max_players?: number | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          season_id?: string | null;
          ruleset_id?: string | null;
          name?: string;
          slug?: string;
          description?: string | null;
          location?: string | null;
          location_url?: string | null;
          event_date?: string;
          event_time?: string | null;
          prize_info?: string | null;
          category?: "semanal" | "oficial" | "amistoso";
          format?:
            | "swiss_top_cut"
            | "swiss_only"
            | "swiss"
            | "single_elim"
            | "double_elim";
          swiss_rounds?: number;
          top_cut_size?: number | null;
          status?: "draft" | "open" | "ongoing" | "finished";
          registration_status?: "closed" | "open" | "finished";
          entry_fee?: number | null;
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
          },
          {
            foreignKeyName: "tournaments_ruleset_id_fkey";
            columns: ["ruleset_id"];
            isOneToOne: false;
            referencedRelation: "rulesets";
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
          player1_combo_id: string | null;
          player2_combo_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          round_number: number;
          scoring_player_id?: string | null;
          finish_type: "spin" | "over" | "burst" | "xtreme" | "draw";
          points_awarded: number;
          player1_combo_id?: string | null;
          player2_combo_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          match_id?: string;
          round_number?: number;
          scoring_player_id?: string | null;
          finish_type?: "spin" | "over" | "burst" | "xtreme" | "draw";
          points_awarded?: number;
          player1_combo_id?: string | null;
          player2_combo_id?: string | null;
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
          },
          {
            foreignKeyName: "match_games_player1_combo_id_fkey";
            columns: ["player1_combo_id"];
            isOneToOne: false;
            referencedRelation: "registration_combos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "match_games_player2_combo_id_fkey";
            columns: ["player2_combo_id"];
            isOneToOne: false;
            referencedRelation: "registration_combos";
            referencedColumns: ["id"];
          }
        ];
      };
      parts_catalog: {
        Row: {
          id: string;
          name: string;
          aliases: string[];
          part_type:
            | "blade"
            | "main_blade"
            | "metal_blade"
            | "over_blade"
            | "lock_chip"
            | "assist_blade"
            | "ratchet"
            | "bit";
          line: "BX" | "BXE" | "UX" | "UXE" | "CX" | "CXE" | null;
          is_simple_ratchet: boolean;
          requires_simple_ratchet: boolean;
          blocks_bit: boolean;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          aliases?: string[];
          part_type:
            | "blade"
            | "main_blade"
            | "metal_blade"
            | "over_blade"
            | "lock_chip"
            | "assist_blade"
            | "ratchet"
            | "bit";
          line?: "BX" | "BXE" | "UX" | "UXE" | "CX" | "CXE" | null;
          is_simple_ratchet?: boolean;
          requires_simple_ratchet?: boolean;
          blocks_bit?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          aliases?: string[];
          part_type?:
            | "blade"
            | "main_blade"
            | "metal_blade"
            | "over_blade"
            | "lock_chip"
            | "assist_blade"
            | "ratchet"
            | "bit";
          line?: "BX" | "BXE" | "UX" | "UXE" | "CX" | "CXE" | null;
          is_simple_ratchet?: boolean;
          requires_simple_ratchet?: boolean;
          blocks_bit?: boolean;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      rulesets: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ruleset_banned_parts: {
        Row: {
          id: string;
          ruleset_id: string;
          part_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          ruleset_id: string;
          part_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          ruleset_id?: string;
          part_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "ruleset_banned_parts_ruleset_id_fkey";
            columns: ["ruleset_id"];
            isOneToOne: false;
            referencedRelation: "rulesets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ruleset_banned_parts_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts_catalog";
            referencedColumns: ["id"];
          }
        ];
      };
      league_settings: {
        Row: {
          id: number;
          pix_key: string | null;
          pix_receiver_name: string | null;
          pix_city: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          pix_key?: string | null;
          pix_receiver_name?: string | null;
          pix_city?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: number;
          pix_key?: string | null;
          pix_receiver_name?: string | null;
          pix_city?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      blader_inventory: {
        Row: {
          id: string;
          blader_id: string;
          part_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          blader_id: string;
          part_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          blader_id?: string;
          part_id?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blader_inventory_blader_id_fkey";
            columns: ["blader_id"];
            isOneToOne: false;
            referencedRelation: "bladers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blader_inventory_part_id_fkey";
            columns: ["part_id"];
            isOneToOne: false;
            referencedRelation: "parts_catalog";
            referencedColumns: ["id"];
          }
        ];
      };
      tournament_registrations: {
        Row: {
          id: string;
          tournament_id: string;
          blader_id: string;
          status: "pending" | "approved" | "rejected";
          payment_verified: boolean;
          payment_verified_at: string | null;
          payment_verified_by: string | null;
          receipt_path: string | null;
          decks_verified: boolean;
          rejection_reason: string | null;
          original_part_ids: string[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tournament_id: string;
          blader_id: string;
          status?: "pending" | "approved" | "rejected";
          payment_verified?: boolean;
          payment_verified_at?: string | null;
          payment_verified_by?: string | null;
          receipt_path?: string | null;
          decks_verified?: boolean;
          rejection_reason?: string | null;
          original_part_ids?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tournament_id?: string;
          blader_id?: string;
          status?: "pending" | "approved" | "rejected";
          payment_verified?: boolean;
          payment_verified_at?: string | null;
          payment_verified_by?: string | null;
          receipt_path?: string | null;
          decks_verified?: boolean;
          rejection_reason?: string | null;
          original_part_ids?: string[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tournament_registrations_tournament_id_fkey";
            columns: ["tournament_id"];
            isOneToOne: false;
            referencedRelation: "tournaments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tournament_registrations_blader_id_fkey";
            columns: ["blader_id"];
            isOneToOne: false;
            referencedRelation: "bladers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tournament_registrations_payment_verified_by_fkey";
            columns: ["payment_verified_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      registration_combos: {
        Row: {
          id: string;
          registration_id: string;
          slot_number: number;
          system: "BX" | "BXE" | "UX" | "UXE" | "CX" | "CXE" | null;
          blade_id: string | null;
          over_blade_id: string | null;
          ratchet_id: string | null;
          bit_id: string | null;
          lock_chip_id: string | null;
          assist_blade_id: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          registration_id: string;
          slot_number: number;
          system?: "BX" | "BXE" | "UX" | "UXE" | "CX" | "CXE" | null;
          blade_id?: string | null;
          over_blade_id?: string | null;
          ratchet_id?: string | null;
          bit_id?: string | null;
          lock_chip_id?: string | null;
          assist_blade_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          registration_id?: string;
          slot_number?: number;
          system?: "BX" | "BXE" | "UX" | "UXE" | "CX" | "CXE" | null;
          blade_id?: string | null;
          over_blade_id?: string | null;
          ratchet_id?: string | null;
          bit_id?: string | null;
          lock_chip_id?: string | null;
          assist_blade_id?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "registration_combos_registration_id_fkey";
            columns: ["registration_id"];
            isOneToOne: false;
            referencedRelation: "tournament_registrations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registration_combos_blade_id_fkey";
            columns: ["blade_id"];
            isOneToOne: false;
            referencedRelation: "parts_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registration_combos_over_blade_id_fkey";
            columns: ["over_blade_id"];
            isOneToOne: false;
            referencedRelation: "parts_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registration_combos_ratchet_id_fkey";
            columns: ["ratchet_id"];
            isOneToOne: false;
            referencedRelation: "parts_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registration_combos_bit_id_fkey";
            columns: ["bit_id"];
            isOneToOne: false;
            referencedRelation: "parts_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registration_combos_lock_chip_id_fkey";
            columns: ["lock_chip_id"];
            isOneToOne: false;
            referencedRelation: "parts_catalog";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "registration_combos_assist_blade_id_fkey";
            columns: ["assist_blade_id"];
            isOneToOne: false;
            referencedRelation: "parts_catalog";
            referencedColumns: ["id"];
          }
        ];
      };
      blader_claim_requests: {
        Row: {
          id: string;
          blader_id: string;
          user_id: string;
          user_email: string | null;
          user_name: string | null;
          user_avatar_url: string | null;
          note: string | null;
          status: "pending" | "approved" | "rejected";
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          blader_id: string;
          user_id: string;
          user_email?: string | null;
          user_name?: string | null;
          user_avatar_url?: string | null;
          note?: string | null;
          status?: "pending" | "approved" | "rejected";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          blader_id?: string;
          user_id?: string;
          user_email?: string | null;
          user_name?: string | null;
          user_avatar_url?: string | null;
          note?: string | null;
          status?: "pending" | "approved" | "rejected";
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "blader_claim_requests_blader_id_fkey";
            columns: ["blader_id"];
            isOneToOne: false;
            referencedRelation: "bladers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blader_claim_requests_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "blader_claim_requests_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      tournament_category: "semanal" | "oficial" | "amistoso";
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
      part_type:
        | "blade"
        | "main_blade"
        | "metal_blade"
        | "over_blade"
        | "lock_chip"
        | "assist_blade"
        | "ratchet"
        | "bit";
      part_line: "BX" | "BXE" | "UX" | "UXE" | "CX" | "CXE";
      bey_system: "BX" | "BXE" | "UX" | "UXE" | "CX" | "CXE";
      tournament_registration_status: "closed" | "open" | "finished";
      registration_status: "pending" | "approved" | "rejected";
      claim_request_status: "pending" | "approved" | "rejected";
    };
    CompositeTypes: Record<string, never>;
  };
};
