export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      affinity_scores: {
        Row: {
          created_at: string | null
          entity_id: string
          entity_name: string
          entity_type: string
          id: string
          matched_traits: Json | null
          reasoning: string
          score: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entity_id: string
          entity_name: string
          entity_type: string
          id?: string
          matched_traits?: Json | null
          reasoning?: string
          score?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          entity_id?: string
          entity_name?: string
          entity_type?: string
          id?: string
          matched_traits?: Json | null
          reasoning?: string
          score?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      memory_entries: {
        Row: {
          created_at: string
          detail: string
          id: string
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          detail?: string
          id?: string
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          detail?: string
          id?: string
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profile_snapshots: {
        Row: {
          created_at: string | null
          id: string
          profile_data: Json
          trigger_event: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          profile_data: Json
          trigger_event?: string
          user_id: string
          version: number
        }
        Update: {
          created_at?: string | null
          id?: string
          profile_data?: Json
          trigger_event?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          degree: string | null
          email: string
          field_ids: string[] | null
          first_name: string
          id: string
          journey_state: string
          last_name: string
          onboarding_done: boolean
          skills: string[] | null
          socrate_done: boolean
          thesis_topic: string | null
          university: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          degree?: string | null
          email?: string
          field_ids?: string[] | null
          first_name?: string
          id?: string
          journey_state?: string
          last_name?: string
          onboarding_done?: boolean
          skills?: string[] | null
          socrate_done?: boolean
          thesis_topic?: string | null
          university?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          degree?: string | null
          email?: string
          field_ids?: string[] | null
          first_name?: string
          id?: string
          journey_state?: string
          last_name?: string
          onboarding_done?: boolean
          skills?: string[] | null
          socrate_done?: boolean
          thesis_topic?: string | null
          university?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      session_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          section: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          section?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          section?: string | null
          user_id?: string
        }
        Relationships: []
      }
      socrate_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      socrate_suggestions: {
        Row: {
          category: string
          created_at: string
          detail: string | null
          id: string
          reason: string | null
          title: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          detail?: string | null
          id?: string
          reason?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          detail?: string | null
          id?: string
          reason?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      socrate_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          description: string
          estimated_minutes: number | null
          id: string
          priority: string
          section: string
          source: string | null
          status: string
          title: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          description: string
          estimated_minutes?: number | null
          id?: string
          priority?: string
          section: string
          source?: string | null
          status?: string
          title: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          description?: string
          estimated_minutes?: number | null
          id?: string
          priority?: string
          section?: string
          source?: string | null
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      student_profiles: {
        Row: {
          career_interests: Json | null
          created_at: string | null
          critical_thinking: string | null
          deep_interests: Json | null
          estimated_days_remaining: number | null
          id: string
          industry_fit: Json | null
          last_active_at: string | null
          last_extraction_at: string | null
          latex_sections_analyzed: Json | null
          methodology_awareness: string | null
          overall_completion: number | null
          reasoning_style: string | null
          research_maturity: string | null
          sections_progress: Json | null
          severita: number | null
          strengths: Json | null
          thesis_quality_score: number | null
          thesis_stage: string | null
          total_exchanges: number | null
          total_extractions: number | null
          updated_at: string | null
          user_id: string
          version: number | null
          weaknesses: Json | null
          writing_quality: string | null
        }
        Insert: {
          career_interests?: Json | null
          created_at?: string | null
          critical_thinking?: string | null
          deep_interests?: Json | null
          estimated_days_remaining?: number | null
          id?: string
          industry_fit?: Json | null
          last_active_at?: string | null
          last_extraction_at?: string | null
          latex_sections_analyzed?: Json | null
          methodology_awareness?: string | null
          overall_completion?: number | null
          reasoning_style?: string | null
          research_maturity?: string | null
          sections_progress?: Json | null
          severita?: number | null
          strengths?: Json | null
          thesis_quality_score?: number | null
          thesis_stage?: string | null
          total_exchanges?: number | null
          total_extractions?: number | null
          updated_at?: string | null
          user_id: string
          version?: number | null
          weaknesses?: Json | null
          writing_quality?: string | null
        }
        Update: {
          career_interests?: Json | null
          created_at?: string | null
          critical_thinking?: string | null
          deep_interests?: Json | null
          estimated_days_remaining?: number | null
          id?: string
          industry_fit?: Json | null
          last_active_at?: string | null
          last_extraction_at?: string | null
          latex_sections_analyzed?: Json | null
          methodology_awareness?: string | null
          overall_completion?: number | null
          reasoning_style?: string | null
          research_maturity?: string | null
          sections_progress?: Json | null
          severita?: number | null
          strengths?: Json | null
          thesis_quality_score?: number | null
          thesis_stage?: string | null
          total_exchanges?: number | null
          total_extractions?: number | null
          updated_at?: string | null
          user_id?: string
          version?: number | null
          weaknesses?: Json | null
          writing_quality?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
