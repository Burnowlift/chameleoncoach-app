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
      block_notes: {
        Row: {
          block_id: string
          created_at: string
          id: string
          message: string
          student_id: string
        }
        Insert: {
          block_id: string
          created_at?: string
          id?: string
          message: string
          student_id: string
        }
        Update: {
          block_id?: string
          created_at?: string
          id?: string
          message?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_notes_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "training_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      body_weight_history: {
        Row: {
          created_at: string
          id: string
          measured_at: string
          notes: string | null
          student_id: string
          weight_kg: number
        }
        Insert: {
          created_at?: string
          id?: string
          measured_at?: string
          notes?: string | null
          student_id: string
          weight_kg: number
        }
        Update: {
          created_at?: string
          id?: string
          measured_at?: string
          notes?: string | null
          student_id?: string
          weight_kg?: number
        }
        Relationships: []
      }
      coach_permission_audit: {
        Row: {
          changed_at: string
          changed_by_email: string
          coach_id: string
          id: string
          menu_key: string
          new_allowed: boolean
          old_allowed: boolean | null
        }
        Insert: {
          changed_at?: string
          changed_by_email: string
          coach_id: string
          id?: string
          menu_key: string
          new_allowed: boolean
          old_allowed?: boolean | null
        }
        Update: {
          changed_at?: string
          changed_by_email?: string
          coach_id?: string
          id?: string
          menu_key?: string
          new_allowed?: boolean
          old_allowed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "coach_permission_audit_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_permissions: {
        Row: {
          allowed: boolean
          coach_id: string
          created_at: string
          id: string
          menu_key: string
          updated_at: string
        }
        Insert: {
          allowed?: boolean
          coach_id: string
          created_at?: string
          id?: string
          menu_key: string
          updated_at?: string
        }
        Update: {
          allowed?: boolean
          coach_id?: string
          created_at?: string
          id?: string
          menu_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_permissions_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
        ]
      }
      coaches: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string | null
        }
        Relationships: []
      }
      completed_weeks: {
        Row: {
          block_id: string
          created_at: string
          id: string
          student_id: string
          week_number: number
        }
        Insert: {
          block_id: string
          created_at?: string
          id?: string
          student_id: string
          week_number: number
        }
        Update: {
          block_id?: string
          created_at?: string
          id?: string
          student_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "completed_weeks_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "training_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "completed_weeks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_logs: {
        Row: {
          actual_rpe: number | null
          block_id: string
          completed: boolean
          created_at: string
          exercise_id: string
          id: string
          notes: string | null
          session_id: string
          student_id: string
          week_number: number
          weight: number
        }
        Insert: {
          actual_rpe?: number | null
          block_id: string
          completed?: boolean
          created_at?: string
          exercise_id: string
          id?: string
          notes?: string | null
          session_id: string
          student_id: string
          week_number: number
          weight?: number
        }
        Update: {
          actual_rpe?: number | null
          block_id?: string
          completed?: boolean
          created_at?: string
          exercise_id?: string
          id?: string
          notes?: string | null
          session_id?: string
          student_id?: string
          week_number?: number
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "exercise_logs_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "training_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          created_at: string
          id: string
          is_bench_rm: boolean
          is_deadlift_rm: boolean
          is_squat_rm: boolean
          muscle_group: string
          muscle_group_2: string | null
          muscle_group_3: string | null
          name: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_bench_rm?: boolean
          is_deadlift_rm?: boolean
          is_squat_rm?: boolean
          muscle_group: string
          muscle_group_2?: string | null
          muscle_group_3?: string | null
          name: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_bench_rm?: boolean
          is_deadlift_rm?: boolean
          is_squat_rm?: boolean
          muscle_group?: string
          muscle_group_2?: string | null
          muscle_group_3?: string | null
          name?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      finance_categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_default: boolean
          name: string
          scope: string
          type: string
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          name: string
          scope: string
          type: string
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          name?: string
          scope?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      finance_goal_contributions: {
        Row: {
          amount: number
          created_at: string
          date: string
          goal_id: string
          id: string
          notes: string | null
          source: string
          transaction_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          goal_id: string
          id?: string
          notes?: string | null
          source?: string
          transaction_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          goal_id?: string
          id?: string
          notes?: string | null
          source?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finance_goal_contributions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "finance_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_goal_contributions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "finance_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_goals: {
        Row: {
          auto_percentage: number | null
          auto_scope: string | null
          color: string
          created_at: string
          current_amount: number
          deadline: string | null
          icon: string
          id: string
          name: string
          target_amount: number
          updated_at: string
        }
        Insert: {
          auto_percentage?: number | null
          auto_scope?: string | null
          color?: string
          created_at?: string
          current_amount?: number
          deadline?: string | null
          icon?: string
          id?: string
          name: string
          target_amount: number
          updated_at?: string
        }
        Update: {
          auto_percentage?: number | null
          auto_scope?: string | null
          color?: string
          created_at?: string
          current_amount?: number
          deadline?: string | null
          icon?: string
          id?: string
          name?: string
          target_amount?: number
          updated_at?: string
        }
        Relationships: []
      }
      finance_recurrences: {
        Row: {
          active: boolean
          amount: number
          category_id: string | null
          created_at: string
          day_of_month: number
          description: string
          end_date: string | null
          id: string
          last_generated_date: string | null
          scope: string
          start_date: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          amount: number
          category_id?: string | null
          created_at?: string
          day_of_month: number
          description: string
          end_date?: string | null
          id?: string
          last_generated_date?: string | null
          scope: string
          start_date?: string
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          amount?: number
          category_id?: string | null
          created_at?: string
          day_of_month?: number
          description?: string
          end_date?: string | null
          id?: string
          last_generated_date?: string | null
          scope?: string
          start_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_recurrences_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      finance_transactions: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          date: string
          description: string
          id: string
          recurrence_id: string | null
          scope: string
          type: string
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          date?: string
          description: string
          id?: string
          recurrence_id?: string | null
          scope: string
          type: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string
          id?: string
          recurrence_id?: string | null
          scope?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "finance_transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "finance_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "finance_transactions_recurrence_id_fkey"
            columns: ["recurrence_id"]
            isOneToOne: false
            referencedRelation: "finance_recurrences"
            referencedColumns: ["id"]
          },
        ]
      }
      mobility_exercises: {
        Row: {
          area: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          area?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          area?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      mobility_logs: {
        Row: {
          created_at: string
          done_date: string
          id: string
          notes: string | null
          student_id: string
          student_mobility_id: string
        }
        Insert: {
          created_at?: string
          done_date?: string
          id?: string
          notes?: string | null
          student_id: string
          student_mobility_id: string
        }
        Update: {
          created_at?: string
          done_date?: string
          id?: string
          notes?: string | null
          student_id?: string
          student_mobility_id?: string
        }
        Relationships: []
      }
      mobility_template_items: {
        Row: {
          area: string | null
          created_at: string
          id: string
          mobility_exercise_id: string | null
          name: string
          position: number
          prescription: string | null
          session_index: number
          template_id: string
          video_url: string | null
        }
        Insert: {
          area?: string | null
          created_at?: string
          id?: string
          mobility_exercise_id?: string | null
          name: string
          position?: number
          prescription?: string | null
          session_index?: number
          template_id: string
          video_url?: string | null
        }
        Update: {
          area?: string | null
          created_at?: string
          id?: string
          mobility_exercise_id?: string | null
          name?: string
          position?: number
          prescription?: string | null
          session_index?: number
          template_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mobility_template_items_mobility_exercise_id_fkey"
            columns: ["mobility_exercise_id"]
            isOneToOne: false
            referencedRelation: "mobility_exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mobility_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "mobility_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      mobility_templates: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          session_count: number
          session_names: Json
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          session_count?: number
          session_names?: Json
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          session_count?: number
          session_names?: Json
          updated_at?: string
        }
        Relationships: []
      }
      podium_events: {
        Row: {
          acknowledged: boolean
          detected_at: string
          id: string
          position: number
          score: number
          semester: number
          student_avatar: string | null
          student_id: string
          student_name: string
          year: number
        }
        Insert: {
          acknowledged?: boolean
          detected_at?: string
          id?: string
          position: number
          score: number
          semester: number
          student_avatar?: string | null
          student_id: string
          student_name: string
          year: number
        }
        Update: {
          acknowledged?: boolean
          detected_at?: string
          id?: string
          position?: number
          score?: number
          semester?: number
          student_avatar?: string | null
          student_id?: string
          student_name?: string
          year?: number
        }
        Relationships: []
      }
      ranking_archive: {
        Row: {
          archived_at: string
          id: string
          position: number
          score: number
          semester: number
          student_avatar: string | null
          student_id: string
          student_name: string
          year: number
        }
        Insert: {
          archived_at?: string
          id?: string
          position: number
          score: number
          semester: number
          student_avatar?: string | null
          student_id: string
          student_name: string
          year: number
        }
        Update: {
          archived_at?: string
          id?: string
          position?: number
          score?: number
          semester?: number
          student_avatar?: string | null
          student_id?: string
          student_name?: string
          year?: number
        }
        Relationships: []
      }
      rm_history: {
        Row: {
          created_at: string
          estimated_1rm: number
          exercise_id: string
          id: string
          recorded_at: string
          reps: number
          sbd_type: string
          student_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          estimated_1rm: number
          exercise_id: string
          id?: string
          recorded_at?: string
          reps: number
          sbd_type: string
          student_id: string
          weight: number
        }
        Update: {
          created_at?: string
          estimated_1rm?: number
          exercise_id?: string
          id?: string
          recorded_at?: string
          reps?: number
          sbd_type?: string
          student_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "rm_history_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rm_history_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      session_notes: {
        Row: {
          block_id: string
          created_at: string
          id: string
          message: string
          sender: string
          session_id: string
          student_id: string
          week_number: number
        }
        Insert: {
          block_id: string
          created_at?: string
          id?: string
          message: string
          sender?: string
          session_id: string
          student_id: string
          week_number: number
        }
        Update: {
          block_id?: string
          created_at?: string
          id?: string
          message?: string
          sender?: string
          session_id?: string
          student_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "training_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_notes_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_feedback_marks: {
        Row: {
          card_type: string
          id: string
          marked_at: string
          marked_by_email: string | null
          student_id: string
          week_start: string
          weekday: number
        }
        Insert: {
          card_type: string
          id?: string
          marked_at?: string
          marked_by_email?: string | null
          student_id: string
          week_start: string
          weekday: number
        }
        Update: {
          card_type?: string
          id?: string
          marked_at?: string
          marked_by_email?: string | null
          student_id?: string
          week_start?: string
          weekday?: number
        }
        Relationships: []
      }
      student_feedback_notes: {
        Row: {
          card_type: string
          id: string
          note: string
          student_id: string
          updated_at: string
          updated_by_email: string | null
        }
        Insert: {
          card_type: string
          id?: string
          note?: string
          student_id: string
          updated_at?: string
          updated_by_email?: string | null
        }
        Update: {
          card_type?: string
          id?: string
          note?: string
          student_id?: string
          updated_at?: string
          updated_by_email?: string | null
        }
        Relationships: []
      }
      student_mobility: {
        Row: {
          area: string | null
          created_at: string
          id: string
          mobility_exercise_id: string | null
          name: string
          position: number
          prescription: string | null
          session_index: number
          student_id: string
          video_url: string | null
        }
        Insert: {
          area?: string | null
          created_at?: string
          id?: string
          mobility_exercise_id?: string | null
          name: string
          position?: number
          prescription?: string | null
          session_index?: number
          student_id: string
          video_url?: string | null
        }
        Update: {
          area?: string | null
          created_at?: string
          id?: string
          mobility_exercise_id?: string | null
          name?: string
          position?: number
          prescription?: string | null
          session_index?: number
          student_id?: string
          video_url?: string | null
        }
        Relationships: []
      }
      student_password_reset_audit: {
        Row: {
          coach_email: string
          coach_id: string | null
          created_at: string
          id: string
          reset_at: string
          student_id: string
        }
        Insert: {
          coach_email: string
          coach_id?: string | null
          created_at?: string
          id?: string
          reset_at?: string
          student_id: string
        }
        Update: {
          coach_email?: string
          coach_id?: string | null
          created_at?: string
          id?: string
          reset_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_password_reset_audit_coach_id_fkey"
            columns: ["coach_id"]
            isOneToOne: false
            referencedRelation: "coaches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_password_reset_audit_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          avatar: string | null
          bench_1rm: number
          body_weight_kg: number | null
          coach_name: string | null
          cpf: string | null
          created_at: string
          deadlift_1rm: number
          email: string
          has_nutritionist: boolean
          id: string
          joined_at: string
          name: string
          payment_due_date: string | null
          payment_note: string | null
          periodicity: string | null
          phone: string | null
          plan: string
          plan_value: number
          renewal_day: string | null
          renewal_note: string | null
          request_id: string | null
          service_type: string | null
          sex: string | null
          squat_1rm: number
          state: string | null
          status: string
          team: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar?: string | null
          bench_1rm?: number
          body_weight_kg?: number | null
          coach_name?: string | null
          cpf?: string | null
          created_at?: string
          deadlift_1rm?: number
          email: string
          has_nutritionist?: boolean
          id?: string
          joined_at?: string
          name: string
          payment_due_date?: string | null
          payment_note?: string | null
          periodicity?: string | null
          phone?: string | null
          plan: string
          plan_value?: number
          renewal_day?: string | null
          renewal_note?: string | null
          request_id?: string | null
          service_type?: string | null
          sex?: string | null
          squat_1rm?: number
          state?: string | null
          status?: string
          team?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar?: string | null
          bench_1rm?: number
          body_weight_kg?: number | null
          coach_name?: string | null
          cpf?: string | null
          created_at?: string
          deadlift_1rm?: number
          email?: string
          has_nutritionist?: boolean
          id?: string
          joined_at?: string
          name?: string
          payment_due_date?: string | null
          payment_note?: string | null
          periodicity?: string | null
          phone?: string | null
          plan?: string
          plan_value?: number
          renewal_day?: string | null
          renewal_note?: string | null
          request_id?: string | null
          service_type?: string | null
          sex?: string | null
          squat_1rm?: number
          state?: string | null
          status?: string
          team?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      training_blocks: {
        Row: {
          created_at: string
          duration: number
          frequency: number
          id: string
          name: string
          sessions: Json
          student_id: string
          updated_at: string
          week_sessions: Json
        }
        Insert: {
          created_at?: string
          duration?: number
          frequency?: number
          id?: string
          name: string
          sessions?: Json
          student_id: string
          updated_at?: string
          week_sessions?: Json
        }
        Update: {
          created_at?: string
          duration?: number
          frequency?: number
          id?: string
          name?: string
          sessions?: Json
          student_id?: string
          updated_at?: string
          week_sessions?: Json
        }
        Relationships: [
          {
            foreignKeyName: "training_blocks_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      week_notes: {
        Row: {
          block_id: string
          created_at: string
          id: string
          message: string
          student_id: string
          updated_at: string
          week_number: number
        }
        Insert: {
          block_id: string
          created_at?: string
          id?: string
          message?: string
          student_id: string
          updated_at?: string
          week_number: number
        }
        Update: {
          block_id?: string
          created_at?: string
          id?: string
          message?: string
          student_id?: string
          updated_at?: string
          week_number?: number
        }
        Relationships: []
      }
      workout_templates: {
        Row: {
          category: string | null
          created_at: string
          duration: number
          frequency: number
          id: string
          sessions: Json
          template_name: string
          updated_at: string
          week_sessions: Json
        }
        Insert: {
          category?: string | null
          created_at?: string
          duration?: number
          frequency?: number
          id?: string
          sessions?: Json
          template_name: string
          updated_at?: string
          week_sessions?: Json
        }
        Update: {
          category?: string | null
          created_at?: string
          duration?: number
          frequency?: number
          id?: string
          sessions?: Json
          template_name?: string
          updated_at?: string
          week_sessions?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_auth_user_id_by_email: { Args: { _email: string }; Returns: string }
      get_ranking: {
        Args: never
        Returns: {
          actual_load_logs: number
          actual_messages: number
          actual_mobility: number
          avatar: string
          base_score: number
          expected_load_logs: number
          expected_messages: number
          expected_mobility: number
          load_fill_rate: number
          message_rate: number
          mobility_rate: number
          name: string
          penalties: Json
          penalty: number
          rank_position: number
          score: number
          student_id: string
        }[]
      }
      get_strength_ranking: {
        Args: never
        Returns: {
          avatar: string
          bench: number
          body_weight_kg: number
          deadlift: number
          name: string
          sex: string
          squat: number
          student_id: string
        }[]
      }
      has_menu_access: { Args: { _menu: string }; Returns: boolean }
      is_coach: { Args: never; Returns: boolean }
      is_student_owner: { Args: { _student_id: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
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
