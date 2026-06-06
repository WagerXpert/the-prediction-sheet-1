/**
 * Database type definitions for Supabase.
 *
 * To regenerate after schema changes:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/lib/supabase/types.ts
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      sports: {
        Row: {
          id: string
          name: string
          abbreviation: string
          is_active: boolean
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['sports']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['sports']['Insert']>
        Relationships: []
      }
      conferences: {
        Row: {
          id: string
          sport_id: string
          external_id: string | null
          name: string
          abbreviation: string
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['conferences']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['conferences']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'conferences_sport_id_fkey'
            columns: ['sport_id']
            isOneToOne: false
            referencedRelation: 'sports'
            referencedColumns: ['id']
          },
        ]
      }
      teams: {
        Row: {
          id: string
          sport_id: string
          conference_id: string | null
          external_id: string | null
          name: string
          abbreviation: string | null
          mascot: string | null
          logo_url: string | null
          color: string | null
          alt_color: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['teams']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['teams']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'teams_sport_id_fkey'
            columns: ['sport_id']
            isOneToOne: false
            referencedRelation: 'sports'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'teams_conference_id_fkey'
            columns: ['conference_id']
            isOneToOne: false
            referencedRelation: 'conferences'
            referencedColumns: ['id']
          },
        ]
      }
      games: {
        Row: {
          id: string
          sport_id: string
          external_id: number | null
          season: number
          season_type: string
          week: number | null
          game_date: string | null
          home_team_id: string | null
          away_team_id: string | null
          home_team_points: number | null
          away_team_points: number | null
          status: string
          neutral_site: boolean
          conference_game: boolean
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['games']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['games']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'games_sport_id_fkey'
            columns: ['sport_id']
            isOneToOne: false
            referencedRelation: 'sports'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'games_home_team_id_fkey'
            columns: ['home_team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'games_away_team_id_fkey'
            columns: ['away_team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      profiles: {
        Row: {
          id: string
          username: string | null
          display_name: string | null
          avatar_url: string | null
          bio: string | null
          favorite_team_id: string | null
          is_admin: boolean
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'profiles_favorite_team_id_fkey'
            columns: ['favorite_team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      prediction_sets: {
        Row: {
          id: string
          user_id: string
          sport_id: string
          season: number
          name: string | null
          is_locked: boolean
          submitted_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          sport_id: string
          season: number
          name?: string | null
          is_locked?: boolean
          submitted_at?: string | null
        }
        Update: Partial<Database['public']['Tables']['prediction_sets']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'prediction_sets_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'prediction_sets_sport_id_fkey'
            columns: ['sport_id']
            isOneToOne: false
            referencedRelation: 'sports'
            referencedColumns: ['id']
          },
        ]
      }
      predictions_game: {
        Row: {
          id: string
          prediction_set_id: string
          user_id: string
          game_id: string
          picked_team_id: string
          confidence: number | null
          is_correct: boolean | null
          points_awarded: number
          created_at: string
          updated_at: string
        }
        Insert: {
          prediction_set_id: string
          user_id: string
          game_id: string
          picked_team_id: string
          confidence?: number | null
          is_correct?: boolean | null
          points_awarded?: number
        }
        Update: Partial<Database['public']['Tables']['predictions_game']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'predictions_game_prediction_set_id_fkey'
            columns: ['prediction_set_id']
            isOneToOne: false
            referencedRelation: 'prediction_sets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'predictions_game_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'predictions_game_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'predictions_game_picked_team_id_fkey'
            columns: ['picked_team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      predictions_record: {
        Row: {
          id: string
          prediction_set_id: string
          user_id: string
          team_id: string
          predicted_wins: number
          predicted_losses: number
          actual_wins: number | null
          actual_losses: number | null
          is_correct: boolean | null
          points_awarded: number
          created_at: string
          updated_at: string
        }
        Insert: {
          prediction_set_id: string
          user_id: string
          team_id: string
          predicted_wins: number
          predicted_losses: number
          actual_wins?: number | null
          actual_losses?: number | null
          is_correct?: boolean | null
          points_awarded?: number
        }
        Update: Partial<Database['public']['Tables']['predictions_record']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'predictions_record_prediction_set_id_fkey'
            columns: ['prediction_set_id']
            isOneToOne: false
            referencedRelation: 'prediction_sets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'predictions_record_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'predictions_record_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      predictions_standings: {
        Row: {
          id: string
          prediction_set_id: string
          user_id: string
          conference_id: string
          team_id: string
          predicted_rank: number
          actual_rank: number | null
          points_awarded: number
          created_at: string
          updated_at: string
        }
        Insert: {
          prediction_set_id: string
          user_id: string
          conference_id: string
          team_id: string
          predicted_rank: number
          actual_rank?: number | null
          points_awarded?: number
        }
        Update: Partial<Database['public']['Tables']['predictions_standings']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'predictions_standings_prediction_set_id_fkey'
            columns: ['prediction_set_id']
            isOneToOne: false
            referencedRelation: 'prediction_sets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'predictions_standings_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'predictions_standings_conference_id_fkey'
            columns: ['conference_id']
            isOneToOne: false
            referencedRelation: 'conferences'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'predictions_standings_team_id_fkey'
            columns: ['team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      full_season_sessions: {
        Row: {
          id: string
          user_id: string
          sport_id: string
          season: number
          name: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          sport_id: string
          season: number
          name?: string | null
        }
        Update: Partial<Database['public']['Tables']['full_season_sessions']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'fss_user_id_fkey'
            columns: ['user_id']
            isOneToOne: false
            referencedRelation: 'profiles'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fss_sport_id_fkey'
            columns: ['sport_id']
            isOneToOne: false
            referencedRelation: 'sports'
            referencedColumns: ['id']
          },
        ]
      }
      full_season_conferences: {
        Row: {
          session_id: string
          conference_id: string
        }
        Insert: {
          session_id: string
          conference_id: string
        }
        Update: Partial<Database['public']['Tables']['full_season_conferences']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'fsc_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'full_season_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fsc_conference_id_fkey'
            columns: ['conference_id']
            isOneToOne: false
            referencedRelation: 'conferences'
            referencedColumns: ['id']
          },
        ]
      }
      full_season_predictions: {
        Row: {
          id: string
          session_id: string
          game_id: string
          winner_team_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          session_id: string
          game_id: string
          winner_team_id: string
          updated_at?: string
        }
        Update: Partial<Database['public']['Tables']['full_season_predictions']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'fsp_session_id_fkey'
            columns: ['session_id']
            isOneToOne: false
            referencedRelation: 'full_season_sessions'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fsp_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'fsp_winner_team_id_fkey'
            columns: ['winner_team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      sync_log: {
        Row: {
          id: string
          sport_id: string
          sync_type: string
          season: number | null
          week: number | null
          status: string
          records_affected: number | null
          error_message: string | null
          synced_at: string
        }
        Insert: Omit<Database['public']['Tables']['sync_log']['Row'], 'id' | 'synced_at'>
        Update: Partial<Database['public']['Tables']['sync_log']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'sync_log_sport_id_fkey'
            columns: ['sport_id']
            isOneToOne: false
            referencedRelation: 'sports'
            referencedColumns: ['id']
          },
        ]
      }
      cfp_brackets: {
        Row: {
          id: string
          session_id: string
          season: number
          seedings: Json
          cfp_rankings: Json
          is_customized: boolean
          sim_seed: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['cfp_brackets']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Database['public']['Tables']['cfp_brackets']['Row'], 'id' | 'created_at'>>
        Relationships: [
          {
            foreignKeyName: 'cfpb_session_id_fkey'
            columns: ['session_id']
            isOneToOne: true
            referencedRelation: 'full_season_sessions'
            referencedColumns: ['id']
          },
        ]
      }
      cfp_picks: {
        Row: {
          id: string
          bracket_id: string
          round: number
          game_index: number
          winner_team_id: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['cfp_picks']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['cfp_picks']['Insert']>
        Relationships: [
          {
            foreignKeyName: 'cfpp_bracket_id_fkey'
            columns: ['bracket_id']
            isOneToOne: false
            referencedRelation: 'cfp_brackets'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'cfpp_winner_team_id_fkey'
            columns: ['winner_team_id']
            isOneToOne: false
            referencedRelation: 'teams'
            referencedColumns: ['id']
          },
        ]
      }
      cfp_conf_champ_games: {
        Row: {
          id: string
          bracket_id: string
          conference_id: string
          conference_name: string
          conference_abbr: string
          team_a_id: string | null
          team_b_id: string | null
          team_a_name: string
          team_b_name: string
          team_a_abbr: string | null
          team_b_abbr: string | null
          team_a_logo: string | null
          team_b_logo: string | null
          team_a_color: string | null
          team_b_color: string | null
          team_a_wins: number
          team_a_losses: number
          team_b_wins: number
          team_b_losses: number
          team_a_conf_wins: number
          team_a_conf_losses: number
          team_b_conf_wins: number
          team_b_conf_losses: number
          winner_team_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['cfp_conf_champ_games']['Row'], 'id' | 'created_at'>
        Update: Partial<Omit<Database['public']['Tables']['cfp_conf_champ_games']['Row'], 'id' | 'created_at'>>
        Relationships: [
          {
            foreignKeyName: 'cfp_cchamp_bracket_fkey'
            columns: ['bracket_id']
            isOneToOne: false
            referencedRelation: 'cfp_brackets'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: {
      [_ in never]?: never
    }
    Functions: {
      [_ in never]?: never
    }
    Enums: {
      [_ in never]?: never
    }
    CompositeTypes: {
      [_ in never]?: never
    }
  }
}

// Convenience row types
export type Sport = Database['public']['Tables']['sports']['Row']
export type Conference = Database['public']['Tables']['conferences']['Row']
export type Team = Database['public']['Tables']['teams']['Row']
export type Game = Database['public']['Tables']['games']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type PredictionSet = Database['public']['Tables']['prediction_sets']['Row']
export type PredictionGame = Database['public']['Tables']['predictions_game']['Row']
export type PredictionRecord = Database['public']['Tables']['predictions_record']['Row']
export type PredictionStandings = Database['public']['Tables']['predictions_standings']['Row']
export type SyncLog = Database['public']['Tables']['sync_log']['Row']
