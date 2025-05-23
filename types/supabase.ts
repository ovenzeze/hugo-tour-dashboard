export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      agent_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          responses: Json | null
          started_at: string
          status: string | null
          thread_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          responses?: Json | null
          started_at?: string
          status?: string | null
          thread_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          responses?: Json | null
          started_at?: string
          status?: string | null
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_runs_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["thread_id"]
          },
        ]
      }
      devices: {
        Row: {
          account_id: string
          created_at: string | null
          id: string
          is_online: boolean | null
          last_seen: string | null
          name: string | null
          updated_at: string | null
        }
        Insert: {
          account_id: string
          created_at?: string | null
          id?: string
          is_online?: boolean | null
          last_seen?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Update: {
          account_id?: string
          created_at?: string | null
          id?: string
          is_online?: boolean | null
          last_seen?: string | null
          name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      galleries: {
        Row: {
          created_at: string | null
          description: string | null
          floor_plan_coordinate: Json | null
          gallery_id: number
          gallery_number: string | null
          location_description: string | null
          museum_id: number
          name: string
          theme: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          floor_plan_coordinate?: Json | null
          gallery_id?: number
          gallery_number?: string | null
          location_description?: string | null
          museum_id: number
          name: string
          theme?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          floor_plan_coordinate?: Json | null
          gallery_id?: number
          gallery_number?: string | null
          location_description?: string | null
          museum_id?: number
          name?: string
          theme?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "galleries_museum_id_fkey"
            columns: ["museum_id"]
            isOneToOne: false
            referencedRelation: "museum_stats"
            referencedColumns: ["museum_id"]
          },
          {
            foreignKeyName: "galleries_museum_id_fkey"
            columns: ["museum_id"]
            isOneToOne: false
            referencedRelation: "museums"
            referencedColumns: ["museum_id"]
          },
        ]
      }
      guide_audios: {
        Row: {
          audio_guide_id: number
          audio_url: string
          duration_seconds: number | null
          gallery_id: number | null
          generated_at: string | null
          guide_text_id: number | null
          is_active: boolean | null
          is_latest_version: boolean | null
          language: string
          metadata: Json | null
          museum_id: number | null
          object_id: number | null
          persona_id: number
          version: number | null
        }
        Insert: {
          audio_guide_id?: number
          audio_url: string
          duration_seconds?: number | null
          gallery_id?: number | null
          generated_at?: string | null
          guide_text_id?: number | null
          is_active?: boolean | null
          is_latest_version?: boolean | null
          language: string
          metadata?: Json | null
          museum_id?: number | null
          object_id?: number | null
          persona_id: number
          version?: number | null
        }
        Update: {
          audio_guide_id?: number
          audio_url?: string
          duration_seconds?: number | null
          gallery_id?: number | null
          generated_at?: string | null
          guide_text_id?: number | null
          is_active?: boolean | null
          is_latest_version?: boolean | null
          language?: string
          metadata?: Json | null
          museum_id?: number | null
          object_id?: number | null
          persona_id?: number
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "guide_audios_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["gallery_id"]
          },
          {
            foreignKeyName: "guide_audios_guide_text_id_fkey"
            columns: ["guide_text_id"]
            isOneToOne: false
            referencedRelation: "guide_texts"
            referencedColumns: ["guide_text_id"]
          },
          {
            foreignKeyName: "guide_audios_museum_id_fkey"
            columns: ["museum_id"]
            isOneToOne: false
            referencedRelation: "museum_stats"
            referencedColumns: ["museum_id"]
          },
          {
            foreignKeyName: "guide_audios_museum_id_fkey"
            columns: ["museum_id"]
            isOneToOne: false
            referencedRelation: "museums"
            referencedColumns: ["museum_id"]
          },
          {
            foreignKeyName: "guide_audios_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["object_id"]
          },
          {
            foreignKeyName: "guide_audios_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persona_usage_stats"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "guide_audios_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["persona_id"]
          },
        ]
      }
      guide_texts: {
        Row: {
          created_at: string | null
          gallery_id: number | null
          guide_text_id: number
          is_latest_version: boolean | null
          language: string
          museum_id: number | null
          object_id: number | null
          persona_id: number
          transcript: string
          updated_at: string | null
          version: number | null
        }
        Insert: {
          created_at?: string | null
          gallery_id?: number | null
          guide_text_id?: number
          is_latest_version?: boolean | null
          language: string
          museum_id?: number | null
          object_id?: number | null
          persona_id: number
          transcript: string
          updated_at?: string | null
          version?: number | null
        }
        Update: {
          created_at?: string | null
          gallery_id?: number | null
          guide_text_id?: number
          is_latest_version?: boolean | null
          language?: string
          museum_id?: number | null
          object_id?: number | null
          persona_id?: number
          transcript?: string
          updated_at?: string | null
          version?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "guide_texts_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["gallery_id"]
          },
          {
            foreignKeyName: "guide_texts_museum_id_fkey"
            columns: ["museum_id"]
            isOneToOne: false
            referencedRelation: "museum_stats"
            referencedColumns: ["museum_id"]
          },
          {
            foreignKeyName: "guide_texts_museum_id_fkey"
            columns: ["museum_id"]
            isOneToOne: false
            referencedRelation: "museums"
            referencedColumns: ["museum_id"]
          },
          {
            foreignKeyName: "guide_texts_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["object_id"]
          },
          {
            foreignKeyName: "guide_texts_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "persona_usage_stats"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "guide_texts_persona_id_fkey"
            columns: ["persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["persona_id"]
          },
        ]
      }
      messages: {
        Row: {
          content: Json
          created_at: string
          is_llm_message: boolean | null
          message_id: string
          metadata: Json | null
          thread_id: string
          type: string
          updated_at: string
        }
        Insert: {
          content: Json
          created_at?: string
          is_llm_message?: boolean | null
          message_id?: string
          metadata?: Json | null
          thread_id: string
          type: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          is_llm_message?: boolean | null
          message_id?: string
          metadata?: Json | null
          thread_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "threads"
            referencedColumns: ["thread_id"]
          },
        ]
      }
      museums: {
        Row: {
          address: string | null
          city: string | null
          country: string | null
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          logo_url: string | null
          museum_id: number
          name: string
          opening_hours: Json | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          logo_url?: string | null
          museum_id?: number
          name: string
          opening_hours?: Json | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          country?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          logo_url?: string | null
          museum_id?: number
          name?: string
          opening_hours?: Json | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      objects: {
        Row: {
          artist_display_name: string | null
          classification: string | null
          created_at: string | null
          credit_line: string | null
          culture: string | null
          department: string | null
          description: string | null
          dimensions: string | null
          gallery_id: number | null
          image_url: string | null
          is_highlight: boolean | null
          is_public_domain: boolean | null
          link_resource: string | null
          medium: string | null
          metadata_date: string | null
          museum_id: number
          object_date: string | null
          object_id: number
          object_name: string | null
          object_number: string | null
          object_wikidata_url: string | null
          period: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          artist_display_name?: string | null
          classification?: string | null
          created_at?: string | null
          credit_line?: string | null
          culture?: string | null
          department?: string | null
          description?: string | null
          dimensions?: string | null
          gallery_id?: number | null
          image_url?: string | null
          is_highlight?: boolean | null
          is_public_domain?: boolean | null
          link_resource?: string | null
          medium?: string | null
          metadata_date?: string | null
          museum_id: number
          object_date?: string | null
          object_id: number
          object_name?: string | null
          object_number?: string | null
          object_wikidata_url?: string | null
          period?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          artist_display_name?: string | null
          classification?: string | null
          created_at?: string | null
          credit_line?: string | null
          culture?: string | null
          department?: string | null
          description?: string | null
          dimensions?: string | null
          gallery_id?: number | null
          image_url?: string | null
          is_highlight?: boolean | null
          is_public_domain?: boolean | null
          link_resource?: string | null
          medium?: string | null
          metadata_date?: string | null
          museum_id?: number
          object_date?: string | null
          object_id?: number
          object_name?: string | null
          object_number?: string | null
          object_wikidata_url?: string | null
          period?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["gallery_id"]
          },
          {
            foreignKeyName: "objects_museum_id_fkey"
            columns: ["museum_id"]
            isOneToOne: false
            referencedRelation: "museum_stats"
            referencedColumns: ["museum_id"]
          },
          {
            foreignKeyName: "objects_museum_id_fkey"
            columns: ["museum_id"]
            isOneToOne: false
            referencedRelation: "museums"
            referencedColumns: ["museum_id"]
          },
        ]
      }
      personas: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          is_active: boolean | null
          is_recommended_guest: boolean
          is_recommended_host: boolean
          language_support: string[] | null
          name: string
          persona_id: number
          recommended_priority: number | null
          status: string | null
          tts_provider: string | null
          updated_at: string
          voice_description: string | null
          voice_model_identifier: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          is_active?: boolean | null
          is_recommended_guest?: boolean
          is_recommended_host?: boolean
          language_support?: string[] | null
          name: string
          persona_id?: number
          recommended_priority?: number | null
          status?: string | null
          tts_provider?: string | null
          updated_at?: string
          voice_description?: string | null
          voice_model_identifier?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          is_active?: boolean | null
          is_recommended_guest?: boolean
          is_recommended_host?: boolean
          language_support?: string[] | null
          name?: string
          persona_id?: number
          recommended_priority?: number | null
          status?: string | null
          tts_provider?: string | null
          updated_at?: string
          voice_description?: string | null
          voice_model_identifier?: string | null
        }
        Relationships: []
      }
      podcast_segments: {
        Row: {
          created_at: string | null
          idx: number
          podcast_id: string | null
          segment_text_id: string
          speaker: string | null
          text: string | null
        }
        Insert: {
          created_at?: string | null
          idx: number
          podcast_id?: string | null
          segment_text_id?: string
          speaker?: string | null
          text?: string | null
        }
        Update: {
          created_at?: string | null
          idx?: number
          podcast_id?: string | null
          segment_text_id?: string
          speaker?: string | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "podcast_segments_podcast_id_fkey"
            columns: ["podcast_id"]
            isOneToOne: false
            referencedRelation: "podcasts"
            referencedColumns: ["podcast_id"]
          },
        ]
      }
      podcasts: {
        Row: {
          cover_image_url: string | null
          created_at: string
          podcast_id: string
          title: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string
          podcast_id?: string
          title: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string
          podcast_id?: string
          title?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          account_id: string
          created_at: string
          description: string | null
          is_public: boolean | null
          name: string
          project_id: string
          sandbox: Json | null
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          description?: string | null
          is_public?: boolean | null
          name: string
          project_id?: string
          sandbox?: Json | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          description?: string | null
          is_public?: boolean | null
          name?: string
          project_id?: string
          sandbox?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      recordings: {
        Row: {
          a11y_file_path: string | null
          account_id: string
          action_annotated: boolean | null
          action_training_file_path: string | null
          audio_file_path: string | null
          created_at: string | null
          device_id: string
          id: string
          meta: Json | null
          metadata_file_path: string | null
          name: string | null
          preprocessed_file_path: string | null
          raw_data_file_path: string | null
          ui_annotated: boolean | null
          updated_at: string | null
        }
        Insert: {
          a11y_file_path?: string | null
          account_id: string
          action_annotated?: boolean | null
          action_training_file_path?: string | null
          audio_file_path?: string | null
          created_at?: string | null
          device_id: string
          id?: string
          meta?: Json | null
          metadata_file_path?: string | null
          name?: string | null
          preprocessed_file_path?: string | null
          raw_data_file_path?: string | null
          ui_annotated?: boolean | null
          updated_at?: string | null
        }
        Update: {
          a11y_file_path?: string | null
          account_id?: string
          action_annotated?: boolean | null
          action_training_file_path?: string | null
          audio_file_path?: string | null
          created_at?: string | null
          device_id?: string
          id?: string
          meta?: Json | null
          metadata_file_path?: string | null
          name?: string | null
          preprocessed_file_path?: string | null
          raw_data_file_path?: string | null
          ui_annotated?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recordings_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      segment_audios: {
        Row: {
          audio_url: string | null
          created_at: string | null
          params: Json | null
          segment_audio_id: string
          segment_id: string | null
          version_tag: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          params?: Json | null
          segment_audio_id?: string
          segment_id?: string | null
          version_tag?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          params?: Json | null
          segment_audio_id?: string
          segment_id?: string | null
          version_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "segment_audios_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "podcast_segments"
            referencedColumns: ["segment_text_id"]
          },
        ]
      }
      synthesis_tasks: {
        Row: {
          created_at: string
          error_message: string | null
          podcast_id: string
          progress_completed: number
          progress_current_segment: number | null
          progress_total: number
          results: Json | null
          status: string
          task_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          podcast_id: string
          progress_completed?: number
          progress_current_segment?: number | null
          progress_total: number
          results?: Json | null
          status?: string
          task_id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          podcast_id?: string
          progress_completed?: number
          progress_current_segment?: number | null
          progress_total?: number
          results?: Json | null
          status?: string
          task_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      threads: {
        Row: {
          account_id: string | null
          created_at: string
          is_public: boolean | null
          project_id: string | null
          thread_id: string
          updated_at: string
        }
        Insert: {
          account_id?: string | null
          created_at?: string
          is_public?: boolean | null
          project_id?: string | null
          thread_id?: string
          updated_at?: string
        }
        Update: {
          account_id?: string | null
          created_at?: string
          is_public?: boolean | null
          project_id?: string | null
          thread_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "threads_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["project_id"]
          },
        ]
      }
    }
    Views: {
      museum_stats: {
        Row: {
          gallery_count: number | null
          guide_audio_count: number | null
          guide_text_count: number | null
          museum_id: number | null
          museum_name: string | null
          object_count: number | null
        }
        Relationships: []
      }
      persona_usage_stats: {
        Row: {
          guide_audio_count: number | null
          guide_text_count: number | null
          is_recommended_guest: boolean | null
          is_recommended_host: boolean | null
          language_support: string[] | null
          persona_id: number | null
          persona_name: string | null
          podcast_segment_count: number | null
        }
        Relationships: []
      }
      podcast_stats: {
        Row: {
          avg_segments_per_podcast: number | null
          recent_podcasts: number | null
          total_podcasts: number | null
        }
        Relationships: []
      }
      synthesis_task_summary: {
        Row: {
          avg_progress_percent: number | null
          status: string | null
          task_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_llm_formatted_messages: {
        Args: { p_thread_id: string }
        Returns: Json
      }
      transfer_device: {
        Args: {
          device_id: string
          new_account_id: string
          device_name?: string
        }
        Returns: {
          account_id: string
          created_at: string | null
          id: string
          is_online: boolean | null
          last_seen: string | null
          name: string | null
          updated_at: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
