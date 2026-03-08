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
      articles: {
        Row: {
          category: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          is_raw: boolean | null
          original_notes: string
          published: boolean
          title: string
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_raw?: boolean | null
          original_notes?: string
          published?: boolean
          title: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_raw?: boolean | null
          original_notes?: string
          published?: boolean
          title?: string
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
          title: string
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
          title: string
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
          title?: string
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
          cards: Json
          category: string
          created_at: string
          deleted_at: string | null
          id: string
          is_raw: boolean | null
          original_notes: string
          published: boolean
          title: string
        }
        Insert: {
          cards?: Json
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_raw?: boolean | null
          original_notes?: string
          published?: boolean
          title: string
        }
        Update: {
          cards?: Json
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_raw?: boolean | null
          original_notes?: string
          published?: boolean
          title?: string
        }
        Relationships: []
      }
      mcq_sets: {
        Row: {
          access_password: string
          category: string
          created_at: string
          deleted_at: string | null
          id: string
          is_raw: boolean | null
          original_notes: string
          published: boolean
          questions: Json
          title: string
        }
        Insert: {
          access_password?: string
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_raw?: boolean | null
          original_notes?: string
          published?: boolean
          questions?: Json
          title: string
        }
        Update: {
          access_password?: string
          category?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          is_raw?: boolean | null
          original_notes?: string
          published?: boolean
          questions?: Json
          title?: string
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
      stories: {
        Row: {
          category: string
          content: string
          created_at: string
          deleted_at: string | null
          id: string
          published: boolean
          title: string
        }
        Insert: {
          category?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          published?: boolean
          title: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          published?: boolean
          title?: string
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
