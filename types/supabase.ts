export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      agent_runs: {
        Row: {
          completed_at: string | null
          created_at: string
          error: string | null
          id: string
          responses: Json
          started_at: string
          status: string
          thread_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          responses?: Json
          started_at?: string
          status?: string
          thread_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error?: string | null
          id?: string
          responses?: Json
          started_at?: string
          status?: string
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
            foreignKeyName: "audio_guides_gallery_id_fkey"
            columns: ["gallery_id"]
            isOneToOne: false
            referencedRelation: "galleries"
            referencedColumns: ["gallery_id"]
          },
          {
            foreignKeyName: "audio_guides_guide_text_id_fkey"
            columns: ["guide_text_id"]
            isOneToOne: false
            referencedRelation: "guide_texts"
            referencedColumns: ["guide_text_id"]
          },
          {
            foreignKeyName: "audio_guides_museum_id_fkey"
            columns: ["museum_id"]
            isOneToOne: false
            referencedRelation: "museums"
            referencedColumns: ["museum_id"]
          },
          {
            foreignKeyName: "audio_guides_object_id_fkey"
            columns: ["object_id"]
            isOneToOne: false
            referencedRelation: "objects"
            referencedColumns: ["object_id"]
          },
          {
            foreignKeyName: "audio_guides_persona_id_fkey"
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
            referencedRelation: "personas"
            referencedColumns: ["persona_id"]
          },
        ]
      }
      messages: {
        Row: {
          content: Json
          created_at: string
          is_llm_message: boolean
          message_id: string
          metadata: Json | null
          thread_id: string
          type: string
          updated_at: string
        }
        Insert: {
          content: Json
          created_at?: string
          is_llm_message?: boolean
          message_id?: string
          metadata?: Json | null
          thread_id: string
          type: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          is_llm_message?: boolean
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
            referencedRelation: "museums"
            referencedColumns: ["museum_id"]
          },
        ]
      }
      personas: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          description: string | null
          is_active: boolean | null
          language_support: string[] | null
          name: string
          persona_id: number
          tts_provider: string
          updated_at: string | null
          voice_description: string | null
          voice_model_identifier: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          language_support?: string[] | null
          name: string
          persona_id?: number
          tts_provider?: string
          updated_at?: string | null
          voice_description?: string | null
          voice_model_identifier?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          language_support?: string[] | null
          name?: string
          persona_id?: number
          tts_provider?: string
          updated_at?: string | null
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
            referencedRelation: "full_podcast_details"
            referencedColumns: ["podcast_id"]
          },
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
          created_at: string | null
          creator_persona_id: number | null
          guest_persona_id: number | null
          host_persona_id: number | null
          podcast_id: string
          title: string
          topic: string | null
          total_duration_ms: number | null
          total_word_count: number | null
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          creator_persona_id?: number | null
          guest_persona_id?: number | null
          host_persona_id?: number | null
          podcast_id?: string
          title: string
          topic?: string | null
          total_duration_ms?: number | null
          total_word_count?: number | null
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          creator_persona_id?: number | null
          guest_persona_id?: number | null
          host_persona_id?: number | null
          podcast_id?: string
          title?: string
          topic?: string | null
          total_duration_ms?: number | null
          total_word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "podcasts_creator_persona_id_fkey"
            columns: ["creator_persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "podcasts_guest_persona_id_fkey"
            columns: ["guest_persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["persona_id"]
          },
          {
            foreignKeyName: "podcasts_host_persona_id_fkey"
            columns: ["host_persona_id"]
            isOneToOne: false
            referencedRelation: "personas"
            referencedColumns: ["persona_id"]
          },
        ]
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
            foreignKeyName: "fk_device"
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
          duration_ms: number | null
          params: Json | null
          segment_audio_id: string
          segment_id: string | null
          version_tag: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string | null
          duration_ms?: number | null
          params?: Json | null
          segment_audio_id?: string
          segment_id?: string | null
          version_tag?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string | null
          duration_ms?: number | null
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
      full_podcast_details: {
        Row: {
          podcast_created_at: string | null
          podcast_id: string | null
          podcast_segments_and_audios: Json | null
          podcast_title: string | null
          podcast_topic: string | null
        }
        Insert: {
          podcast_created_at?: string | null
          podcast_id?: string | null
          podcast_segments_and_audios?: never
          podcast_title?: string | null
          podcast_topic?: string | null
        }
        Update: {
          podcast_created_at?: string | null
          podcast_id?: string | null
          podcast_segments_and_audios?: never
          podcast_title?: string | null
          podcast_topic?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_invitation: {
        Args: { lookup_invitation_token: string }
        Returns: Json
      }
      create_account: {
        Args: { slug?: string; name?: string }
        Returns: Json
      }
      create_invitation: {
        Args: {
          account_id: string
          account_role: "owner" | "member"
          invitation_type: "one_time" | "24_hour"
        }
        Returns: Json
      }
      current_user_account_role: {
        Args: { account_id: string }
        Returns: Json
      }
      delete_invitation: {
        Args: { invitation_id: string }
        Returns: undefined
      }
      get_account: {
        Args: { account_id: string }
        Returns: Json
      }
      get_account_billing_status: {
        Args: { account_id: string }
        Returns: Json
      }
      get_account_by_slug: {
        Args: { slug: string }
        Returns: Json
      }
      get_account_id: {
        Args: { slug: string }
        Returns: string
      }
      get_account_invitations: {
        Args: {
          account_id: string
          results_limit?: number
          results_offset?: number
        }
        Returns: Json
      }
      get_account_members: {
        Args: {
          account_id: string
          results_limit?: number
          results_offset?: number
        }
        Returns: Json
      }
      get_accounts: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_llm_formatted_messages: {
        Args: { p_thread_id: string }
        Returns: Json
      }
      get_personal_account: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      lookup_invitation: {
        Args: { lookup_invitation_token: string }
        Returns: Json
      }
      remove_account_member: {
        Args: { account_id: string; user_id: string }
        Returns: undefined
      }
      service_role_upsert_customer_subscription: {
        Args: { account_id: string; customer?: Json; subscription?: Json }
        Returns: undefined
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
      update_account: {
        Args: {
          account_id: string
          slug?: string
          name?: string
          public_metadata?: Json
          replace_metadata?: boolean
        }
        Returns: Json
      }
      update_account_user_role: {
        Args: {
          account_id: string
          user_id: string
          new_account_role: "owner" | "member"
          make_primary_owner?: boolean
        }
        Returns: undefined
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
  public: {
    Enums: {},
  },
} as const
