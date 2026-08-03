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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      access_grants: {
        Row: {
          allow_download: boolean
          amount: number | null
          code: string
          created_at: string
          expires_at: string
          id: string
          last_redeemed_at: string | null
          payment_id: string | null
          phone_number: string | null
          plan: string
          redeem_count: number
          scope: string
        }
        Insert: {
          allow_download?: boolean
          amount?: number | null
          code: string
          created_at?: string
          expires_at: string
          id?: string
          last_redeemed_at?: string | null
          payment_id?: string | null
          phone_number?: string | null
          plan?: string
          redeem_count?: number
          scope?: string
        }
        Update: {
          allow_download?: boolean
          amount?: number | null
          code?: string
          created_at?: string
          expires_at?: string
          id?: string
          last_redeemed_at?: string | null
          payment_id?: string | null
          phone_number?: string | null
          plan?: string
          redeem_count?: number
          scope?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_grants_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          value?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      article_categories: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      article_comments: {
        Row: {
          article_id: string
          author_name: string
          body: string
          created_at: string
          id: string
          parent_id: string | null
        }
        Insert: {
          article_id: string
          author_name?: string
          body: string
          created_at?: string
          id?: string
          parent_id?: string | null
        }
        Update: {
          article_id?: string
          author_name?: string
          body?: string
          created_at?: string
          id?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "article_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "article_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      articles: {
        Row: {
          access_password: string | null
          category: string
          comments_enabled: boolean
          content: string
          content_fts: unknown
          content_kind: string | null
          countdown: Json | null
          created_at: string
          deleted_at: string | null
          exam_type: string | null
          exam_year: string | null
          featured_image: string | null
          html_embed: Json | null
          id: string
          is_raw: boolean | null
          lecturer: string | null
          meta_description: string | null
          meta_title: string | null
          og_image_url: string | null
          original_notes: string
          password_protected: boolean
          published: boolean
          reading_time_minutes: number | null
          scheduled_at: string | null
          school: string | null
          slug: string | null
          tags: string[]
          title: string
          toc_enabled: boolean
          unit: string | null
          university: string | null
          updated_at: string
        }
        Insert: {
          access_password?: string | null
          category?: string
          comments_enabled?: boolean
          content?: string
          content_fts?: unknown
          content_kind?: string | null
          countdown?: Json | null
          created_at?: string
          deleted_at?: string | null
          exam_type?: string | null
          exam_year?: string | null
          featured_image?: string | null
          html_embed?: Json | null
          id?: string
          is_raw?: boolean | null
          lecturer?: string | null
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          original_notes?: string
          password_protected?: boolean
          published?: boolean
          reading_time_minutes?: number | null
          scheduled_at?: string | null
          school?: string | null
          slug?: string | null
          tags?: string[]
          title: string
          toc_enabled?: boolean
          unit?: string | null
          university?: string | null
          updated_at?: string
        }
        Update: {
          access_password?: string | null
          category?: string
          comments_enabled?: boolean
          content?: string
          content_fts?: unknown
          content_kind?: string | null
          countdown?: Json | null
          created_at?: string
          deleted_at?: string | null
          exam_type?: string | null
          exam_year?: string | null
          featured_image?: string | null
          html_embed?: Json | null
          id?: string
          is_raw?: boolean | null
          lecturer?: string | null
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          original_notes?: string
          password_protected?: boolean
          published?: boolean
          reading_time_minutes?: number | null
          scheduled_at?: string | null
          school?: string | null
          slug?: string | null
          tags?: string[]
          title?: string
          toc_enabled?: boolean
          unit?: string | null
          university?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      essays: {
        Row: {
          article_id: string | null
          category: string
          created_at: string
          deleted_at: string | null
          id: string
          long_answer_questions: Json
          published: boolean
          short_answer_questions: Json
          slug: string | null
          title: string
          updated_at: string
        }
        Insert: {
          article_id?: string | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          long_answer_questions?: Json
          published?: boolean
          short_answer_questions?: Json
          slug?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          article_id?: string | null
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          long_answer_questions?: Json
          published?: boolean
          short_answer_questions?: Json
          slug?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "essays_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      exam_results: {
        Row: {
          course: string
          created_at: string
          exam_id: string
          exam_title: string
          id: string
          laq_answers: Json
          mcq_score: number
          mcq_total: number
          saq_answers: Json
          student_name: string
          submit_reason: string | null
          submitted_at: string
          time_taken_seconds: number
          unit: string
          university: string
        }
        Insert: {
          course?: string
          created_at?: string
          exam_id: string
          exam_title?: string
          id?: string
          laq_answers?: Json
          mcq_score?: number
          mcq_total?: number
          saq_answers?: Json
          student_name?: string
          submit_reason?: string | null
          submitted_at?: string
          time_taken_seconds?: number
          unit?: string
          university?: string
        }
        Update: {
          course?: string
          created_at?: string
          exam_id?: string
          exam_title?: string
          id?: string
          laq_answers?: Json
          mcq_score?: number
          mcq_total?: number
          saq_answers?: Json
          student_name?: string
          submit_reason?: string | null
          submitted_at?: string
          time_taken_seconds?: number
          unit?: string
          university?: string
        }
        Relationships: []
      }
      flashcard_sets: {
        Row: {
          access_password: string | null
          cards: Json
          category: string
          comments_enabled: boolean
          countdown: Json | null
          created_at: string
          deleted_at: string | null
          featured_image: string | null
          html_embed: Json | null
          id: string
          is_raw: boolean | null
          original_notes: string
          password_protected: boolean
          published: boolean
          reading_time_minutes: number | null
          scheduled_at: string | null
          slug: string | null
          tags: string[]
          title: string
          toc_enabled: boolean
          updated_at: string
        }
        Insert: {
          access_password?: string | null
          cards?: Json
          category?: string
          comments_enabled?: boolean
          countdown?: Json | null
          created_at?: string
          deleted_at?: string | null
          featured_image?: string | null
          html_embed?: Json | null
          id?: string
          is_raw?: boolean | null
          original_notes?: string
          password_protected?: boolean
          published?: boolean
          reading_time_minutes?: number | null
          scheduled_at?: string | null
          slug?: string | null
          tags?: string[]
          title: string
          toc_enabled?: boolean
          updated_at?: string
        }
        Update: {
          access_password?: string | null
          cards?: Json
          category?: string
          comments_enabled?: boolean
          countdown?: Json | null
          created_at?: string
          deleted_at?: string | null
          featured_image?: string | null
          html_embed?: Json | null
          id?: string
          is_raw?: boolean | null
          original_notes?: string
          password_protected?: boolean
          published?: boolean
          reading_time_minutes?: number | null
          scheduled_at?: string | null
          slug?: string | null
          tags?: string[]
          title?: string
          toc_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      mcq_sets: {
        Row: {
          access_password: string
          category: string
          comments_enabled: boolean
          countdown: Json | null
          created_at: string
          deleted_at: string | null
          exam_type: string | null
          exam_year: string | null
          featured_image: string | null
          html_embed: Json | null
          id: string
          is_raw: boolean | null
          lecturer: string | null
          meta_description: string | null
          meta_title: string | null
          og_image_url: string | null
          original_notes: string
          password_protected: boolean
          published: boolean
          questions: Json
          reading_time_minutes: number | null
          scheduled_at: string | null
          school: string | null
          slug: string | null
          tags: string[]
          title: string
          toc_enabled: boolean
          unit: string | null
          university: string | null
          updated_at: string
        }
        Insert: {
          access_password?: string
          category?: string
          comments_enabled?: boolean
          countdown?: Json | null
          created_at?: string
          deleted_at?: string | null
          exam_type?: string | null
          exam_year?: string | null
          featured_image?: string | null
          html_embed?: Json | null
          id?: string
          is_raw?: boolean | null
          lecturer?: string | null
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          original_notes?: string
          password_protected?: boolean
          published?: boolean
          questions?: Json
          reading_time_minutes?: number | null
          scheduled_at?: string | null
          school?: string | null
          slug?: string | null
          tags?: string[]
          title: string
          toc_enabled?: boolean
          unit?: string | null
          university?: string | null
          updated_at?: string
        }
        Update: {
          access_password?: string
          category?: string
          comments_enabled?: boolean
          countdown?: Json | null
          created_at?: string
          deleted_at?: string | null
          exam_type?: string | null
          exam_year?: string | null
          featured_image?: string | null
          html_embed?: Json | null
          id?: string
          is_raw?: boolean | null
          lecturer?: string | null
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          original_notes?: string
          password_protected?: boolean
          published?: boolean
          questions?: Json
          reading_time_minutes?: number | null
          scheduled_at?: string | null
          school?: string | null
          slug?: string | null
          tags?: string[]
          title?: string
          toc_enabled?: boolean
          unit?: string | null
          university?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          buyer_email: string | null
          buyer_name: string | null
          created_at: string
          id: string
          mpesa_code: string | null
          package_type: string | null
          payment_status: string
          phone_number: string
          project_id: string | null
          provider_txn_id: string | null
          transaction_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          buyer_email?: string | null
          buyer_name?: string | null
          created_at?: string
          id?: string
          mpesa_code?: string | null
          package_type?: string | null
          payment_status?: string
          phone_number: string
          project_id?: string | null
          provider_txn_id?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_email?: string | null
          buyer_name?: string | null
          created_at?: string
          id?: string
          mpesa_code?: string | null
          package_type?: string | null
          payment_status?: string
          phone_number?: string
          project_id?: string | null
          provider_txn_id?: string | null
          transaction_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      pending_institutions: {
        Row: {
          id: string
          reviewed_at: string | null
          status: string
          submitted_at: string
          submitted_by: string | null
          type: string
          value: string
        }
        Insert: {
          id?: string
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          type: string
          value: string
        }
        Update: {
          id?: string
          reviewed_at?: string | null
          status?: string
          submitted_at?: string
          submitted_by?: string | null
          type?: string
          value?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      slide_corrections: {
        Row: {
          admin_note: string | null
          article_id: string
          created_at: string
          id: string
          slide_number: string
          slide_prompt: string | null
          status: string
          submitter_name: string | null
          suggestion: string
          updated_at: string
        }
        Insert: {
          admin_note?: string | null
          article_id: string
          created_at?: string
          id?: string
          slide_number: string
          slide_prompt?: string | null
          status?: string
          submitter_name?: string | null
          suggestion: string
          updated_at?: string
        }
        Update: {
          admin_note?: string | null
          article_id?: string
          created_at?: string
          id?: string
          slide_number?: string
          slide_prompt?: string | null
          status?: string
          submitter_name?: string | null
          suggestion?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "slide_corrections_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          access_password: string | null
          category: string
          comments_enabled: boolean
          content: string
          countdown: Json | null
          cover_image_url: string | null
          created_at: string
          deleted_at: string | null
          featured_image: string | null
          html_embed: Json | null
          id: string
          meta_description: string | null
          meta_title: string | null
          og_image_url: string | null
          password_protected: boolean
          published: boolean
          reading_time_minutes: number | null
          scheduled_at: string | null
          slug: string | null
          tags: string[]
          title: string
          toc_enabled: boolean
        }
        Insert: {
          access_password?: string | null
          category?: string
          comments_enabled?: boolean
          content?: string
          countdown?: Json | null
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          featured_image?: string | null
          html_embed?: Json | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          password_protected?: boolean
          published?: boolean
          reading_time_minutes?: number | null
          scheduled_at?: string | null
          slug?: string | null
          tags?: string[]
          title: string
          toc_enabled?: boolean
        }
        Update: {
          access_password?: string | null
          category?: string
          comments_enabled?: boolean
          content?: string
          countdown?: Json | null
          cover_image_url?: string | null
          created_at?: string
          deleted_at?: string | null
          featured_image?: string | null
          html_embed?: Json | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          password_protected?: boolean
          published?: boolean
          reading_time_minutes?: number | null
          scheduled_at?: string | null
          slug?: string | null
          tags?: string[]
          title?: string
          toc_enabled?: boolean
        }
        Relationships: []
      }
      user_answers: {
        Row: {
          correct_answer: number
          created_at: string
          id: string
          is_correct: boolean
          mcq_set_id: string
          question_index: number
          question_text: string
          selected_answer: number
          user_id: string
        }
        Insert: {
          correct_answer: number
          created_at?: string
          id?: string
          is_correct: boolean
          mcq_set_id: string
          question_index: number
          question_text?: string
          selected_answer: number
          user_id: string
        }
        Update: {
          correct_answer?: number
          created_at?: string
          id?: string
          is_correct?: boolean
          mcq_set_id?: string
          question_index?: number
          question_text?: string
          selected_answer?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_answers_mcq_set_id_fkey"
            columns: ["mcq_set_id"]
            isOneToOne: false
            referencedRelation: "mcq_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _slugify: { Args: { input: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
