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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      academic_years: {
        Row: {
          courses: number | null
          end_date: string | null
          id: string
          label: string | null
          start_date: string | null
          status: string | null
          year: string | null
        }
        Insert: {
          courses?: number | null
          end_date?: string | null
          id: string
          label?: string | null
          start_date?: string | null
          status?: string | null
          year?: string | null
        }
        Update: {
          courses?: number | null
          end_date?: string | null
          id?: string
          label?: string | null
          start_date?: string | null
          status?: string | null
          year?: string | null
        }
        Relationships: []
      }
      ai_chat_logs: {
        Row: {
          course_id: string | null
          created_at: string | null
          hidden_by_student: boolean
          id: string
          lesson_id: string | null
          message: string
          mode: string
          reply: string
          session_id: string | null
          student_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          hidden_by_student?: boolean
          id?: string
          lesson_id?: string | null
          message: string
          mode: string
          reply: string
          session_id?: string | null
          student_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          hidden_by_student?: boolean
          id?: string
          lesson_id?: string | null
          message?: string
          mode?: string
          reply?: string
          session_id?: string | null
          student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_logs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_logs_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses_all"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_logs_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_chat_logs_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string
        }
        Insert: {
          key: string
          updated_at?: string | null
          value: string
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string
        }
        Relationships: []
      }
      allowed_domains: {
        Row: {
          created_at: string
          domain: string
        }
        Insert: {
          created_at?: string
          domain: string
        }
        Update: {
          created_at?: string
          domain?: string
        }
        Relationships: []
      }
      assignments: {
        Row: {
          allow_file: boolean | null
          allow_late: boolean | null
          allow_text: boolean | null
          attachments: Json | null
          course_id: string | null
          due: string | null
          due_short: string | null
          due_time: string | null
          id: string
          instructions: string | null
          lesson_id: string | null
          points: number | null
          rubric_id: string | null
          title: string
        }
        Insert: {
          allow_file?: boolean | null
          allow_late?: boolean | null
          allow_text?: boolean | null
          attachments?: Json | null
          course_id?: string | null
          due?: string | null
          due_short?: string | null
          due_time?: string | null
          id: string
          instructions?: string | null
          lesson_id?: string | null
          points?: number | null
          rubric_id?: string | null
          title: string
        }
        Update: {
          allow_file?: boolean | null
          allow_late?: boolean | null
          allow_text?: boolean | null
          attachments?: Json | null
          course_id?: string | null
          due?: string | null
          due_short?: string | null
          due_time?: string | null
          id?: string
          instructions?: string | null
          lesson_id?: string | null
          points?: number | null
          rubric_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses_all"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_rubric_id_fkey"
            columns: ["rubric_id"]
            isOneToOne: false
            referencedRelation: "rubrics"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcasts: {
        Row: {
          body: string
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          group_id: string | null
          id: string
          pinned: boolean | null
          title: string
          year_level: number[] | null
        }
        Insert: {
          body: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          group_id?: string | null
          id?: string
          pinned?: boolean | null
          title: string
          year_level?: number[] | null
        }
        Update: {
          body?: string
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          group_id?: string | null
          id?: string
          pinned?: boolean | null
          title?: string
          year_level?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcasts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcasts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcasts_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "subject_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      course_instructors: {
        Row: {
          course_id: string
          user_id: string
        }
        Insert: {
          course_id: string
          user_id: string
        }
        Update: {
          course_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_instructors_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_instructors_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses_all"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_instructors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_instructors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      courses_all: {
        Row: {
          access: Json | null
          code: string
          group_id: string | null
          group_name: string | null
          hero: string | null
          id: string
          instructor: string | null
          kind: string
          lessons: number | null
          progress: number | null
          section: string | null
          students: number | null
          subtitle: string | null
          term: string | null
          title: string
          year: string | null
          year_level: number[] | null
        }
        Insert: {
          access?: Json | null
          code: string
          group_id?: string | null
          group_name?: string | null
          hero?: string | null
          id: string
          instructor?: string | null
          kind?: string
          lessons?: number | null
          progress?: number | null
          section?: string | null
          students?: number | null
          subtitle?: string | null
          term?: string | null
          title: string
          year?: string | null
          year_level?: number[] | null
        }
        Update: {
          access?: Json | null
          code?: string
          group_id?: string | null
          group_name?: string | null
          hero?: string | null
          id?: string
          instructor?: string | null
          kind?: string
          lessons?: number | null
          progress?: number | null
          section?: string | null
          students?: number | null
          subtitle?: string | null
          term?: string | null
          title?: string
          year?: string | null
          year_level?: number[] | null
        }
        Relationships: []
      }
      lessons: {
        Row: {
          ai_documents: Json | null
          allow_ai: boolean | null
          allow_download: boolean | null
          assignment: Json | null
          course_id: string | null
          description: string | null
          documents: Json | null
          duration: string | null
          has_assignment: boolean | null
          has_docs: boolean | null
          has_posttest: boolean | null
          has_pretest: boolean | null
          id: string
          index: number | null
          posttest: Json | null
          pretest: Json | null
          progress: number | null
          status: string | null
          title: string
          tutor_draw_count: number | null
          tutor_max_attempts: number | null
          tutor_time_limit_minutes: number | null
          video: boolean | null
          video_path: string | null
          video_url: string | null
          watch_limit: boolean | null
        }
        Insert: {
          ai_documents?: Json | null
          allow_ai?: boolean | null
          allow_download?: boolean | null
          assignment?: Json | null
          course_id?: string | null
          description?: string | null
          documents?: Json | null
          duration?: string | null
          has_assignment?: boolean | null
          has_docs?: boolean | null
          has_posttest?: boolean | null
          has_pretest?: boolean | null
          id: string
          index?: number | null
          posttest?: Json | null
          pretest?: Json | null
          progress?: number | null
          status?: string | null
          title: string
          tutor_draw_count?: number | null
          tutor_max_attempts?: number | null
          tutor_time_limit_minutes?: number | null
          video?: boolean | null
          video_path?: string | null
          video_url?: string | null
          watch_limit?: boolean | null
        }
        Update: {
          ai_documents?: Json | null
          allow_ai?: boolean | null
          allow_download?: boolean | null
          assignment?: Json | null
          course_id?: string | null
          description?: string | null
          documents?: Json | null
          duration?: string | null
          has_assignment?: boolean | null
          has_docs?: boolean | null
          has_posttest?: boolean | null
          has_pretest?: boolean | null
          id?: string
          index?: number | null
          posttest?: Json | null
          pretest?: Json | null
          progress?: number | null
          status?: string | null
          title?: string
          tutor_draw_count?: number | null
          tutor_max_attempts?: number | null
          tutor_time_limit_minutes?: number | null
          video?: boolean | null
          video_path?: string | null
          video_url?: string | null
          watch_limit?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses_all"
            referencedColumns: ["id"]
          },
        ]
      }
      live_answers: {
        Row: {
          answered_at: string
          chosen: string
          correct: boolean
          points: number
          question_idx: number
          session_id: string
          user_id: string
        }
        Insert: {
          answered_at?: string
          chosen: string
          correct: boolean
          points: number
          question_idx: number
          session_id: string
          user_id: string
        }
        Update: {
          answered_at?: string
          chosen?: string
          correct?: boolean
          points?: number
          question_idx?: number
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_answers_session_question_fk"
            columns: ["session_id", "question_idx"]
            isOneToOne: false
            referencedRelation: "live_session_questions"
            referencedColumns: ["session_id", "idx"]
          },
          {
            foreignKeyName: "live_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_answers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      live_players: {
        Row: {
          display_name: string
          joined_at: string
          session_id: string
          team_id: string | null
          user_id: string
        }
        Insert: {
          display_name: string
          joined_at?: string
          session_id: string
          team_id?: string | null
          user_id: string
        }
        Update: {
          display_name?: string
          joined_at?: string
          session_id?: string
          team_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_players_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "live_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_players_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      live_quiz_questions: {
        Row: {
          answer: string
          choices: Json
          id: string
          no: number
          points: number
          quiz_id: string
          text: string
          time_limit_sec: number
        }
        Insert: {
          answer: string
          choices: Json
          id?: string
          no: number
          points?: number
          quiz_id: string
          text: string
          time_limit_sec?: number
        }
        Update: {
          answer?: string
          choices?: Json
          id?: string
          no?: number
          points?: number
          quiz_id?: string
          text?: string
          time_limit_sec?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "live_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      live_quizzes: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_quizzes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_quizzes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      live_session_questions: {
        Row: {
          answer: string
          choices: Json
          idx: number
          points: number
          session_id: string
          text: string
          time_limit_sec: number
        }
        Insert: {
          answer: string
          choices: Json
          idx: number
          points?: number
          session_id: string
          text: string
          time_limit_sec: number
        }
        Update: {
          answer?: string
          choices?: Json
          idx?: number
          points?: number
          session_id?: string
          text?: string
          time_limit_sec?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_session_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          course_id: string
          created_at: string
          current_index: number
          ended_at: string | null
          host_id: string
          id: string
          phase: string
          pin: string
          question_deadline_at: string | null
          question_started_at: string | null
          quiz_id: string | null
          restrict_to_course: boolean
          team_mode: boolean
          title: string
          total: number
        }
        Insert: {
          course_id: string
          created_at?: string
          current_index?: number
          ended_at?: string | null
          host_id: string
          id?: string
          phase?: string
          pin: string
          question_deadline_at?: string | null
          question_started_at?: string | null
          quiz_id?: string | null
          restrict_to_course?: boolean
          team_mode?: boolean
          title: string
          total: number
        }
        Update: {
          course_id?: string
          created_at?: string
          current_index?: number
          ended_at?: string | null
          host_id?: string
          id?: string
          phase?: string
          pin?: string
          question_deadline_at?: string | null
          question_started_at?: string | null
          quiz_id?: string | null
          restrict_to_course?: boolean
          team_mode?: boolean
          title?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses_all"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "live_quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      live_team_members: {
        Row: {
          course_id: string
          team_id: string
          user_id: string
        }
        Insert: {
          course_id: string
          team_id: string
          user_id: string
        }
        Update: {
          course_id?: string
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_team_members_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_team_members_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses_all"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "live_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_team_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      live_team_results: {
        Row: {
          members: number
          score: number
          session_id: string
          team_id: string
        }
        Insert: {
          members: number
          score: number
          session_id: string
          team_id: string
        }
        Update: {
          members?: number
          score?: number
          session_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_team_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_team_results_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "live_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      live_teams: {
        Row: {
          color_no: number
          course_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color_no: number
          course_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color_no?: number
          course_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_teams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_teams_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses_all"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          answer: string | null
          choices: Json | null
          explanation: string | null
          id: string
          kind: string | null
          lesson_id: string | null
          no: number | null
          text: string | null
          topic_id: string | null
          type: string | null
        }
        Insert: {
          answer?: string | null
          choices?: Json | null
          explanation?: string | null
          id: string
          kind?: string | null
          lesson_id?: string | null
          no?: number | null
          text?: string | null
          topic_id?: string | null
          type?: string | null
        }
        Update: {
          answer?: string | null
          choices?: Json | null
          explanation?: string | null
          id?: string
          kind?: string | null
          lesson_id?: string | null
          no?: number | null
          text?: string | null
          topic_id?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_topic_fk"
            columns: ["topic_id", "lesson_id"]
            isOneToOne: false
            referencedRelation: "tutor_topics"
            referencedColumns: ["id", "lesson_id"]
          },
        ]
      }
      reminder_sent_logs: {
        Row: {
          id: string
          reminder_type: string
          sent_at: string | null
          student_id: string
          target_id: string
          target_type: string
        }
        Insert: {
          id?: string
          reminder_type: string
          sent_at?: string | null
          student_id: string
          target_id: string
          target_type: string
        }
        Update: {
          id?: string
          reminder_type?: string
          sent_at?: string | null
          student_id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          permissions: Json | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id: string
          name: string
          permissions?: Json | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          permissions?: Json | null
        }
        Relationships: []
      }
      rubrics: {
        Row: {
          criteria: Json | null
          id: string
          title: string
        }
        Insert: {
          criteria?: Json | null
          id: string
          title: string
        }
        Update: {
          criteria?: Json | null
          id?: string
          title?: string
        }
        Relationships: []
      }
      sections: {
        Row: {
          group_name: string | null
          id: string
          name: string | null
          range_end: string | null
          range_start: string | null
          status: string | null
          students: number | null
          year_level: string | null
        }
        Insert: {
          group_name?: string | null
          id: string
          name?: string | null
          range_end?: string | null
          range_start?: string | null
          status?: string | null
          students?: number | null
          year_level?: string | null
        }
        Update: {
          group_name?: string | null
          id?: string
          name?: string | null
          range_end?: string | null
          range_start?: string | null
          status?: string | null
          students?: number | null
          year_level?: string | null
        }
        Relationships: []
      }
      student_grades: {
        Row: {
          created_at: string
          domain: string
          id: string
          prefix: string
          year_label: string
          year_no: number | null
        }
        Insert: {
          created_at?: string
          domain?: string
          id: string
          prefix: string
          year_label: string
          year_no?: number | null
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          prefix?: string
          year_label?: string
          year_no?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "student_grades_domain_fkey"
            columns: ["domain"]
            isOneToOne: false
            referencedRelation: "allowed_domains"
            referencedColumns: ["domain"]
          },
        ]
      }
      subject_group_managers: {
        Row: {
          group_id: string
          user_id: string
        }
        Insert: {
          group_id: string
          user_id: string
        }
        Update: {
          group_id?: string
          user_id?: string
        }
        Relationships: []
      }
      subject_groups: {
        Row: {
          courses: number | null
          head: string | null
          id: string
          name: string | null
          status: string | null
        }
        Insert: {
          courses?: number | null
          head?: string | null
          id: string
          name?: string | null
          status?: string | null
        }
        Update: {
          courses?: number | null
          head?: string | null
          id?: string
          name?: string | null
          status?: string | null
        }
        Relationships: []
      }
      submissions: {
        Row: {
          assignment_id: string | null
          file: string | null
          grader_id: string | null
          id: string
          late: boolean | null
          score: number | null
          status: string | null
          student_id: string | null
          submitted_at: string | null
          text: string | null
          total: number | null
        }
        Insert: {
          assignment_id?: string | null
          file?: string | null
          grader_id?: string | null
          id: string
          late?: boolean | null
          score?: number | null
          status?: string | null
          student_id?: string | null
          submitted_at?: string | null
          text?: string | null
          total?: number | null
        }
        Update: {
          assignment_id?: string | null
          file?: string | null
          grader_id?: string | null
          id?: string
          late?: boolean | null
          score?: number | null
          status?: string | null
          student_id?: string | null
          submitted_at?: string | null
          text?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_grader_id_fkey"
            columns: ["grader_id"]
            isOneToOne: false
            referencedRelation: "user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_grader_id_fkey"
            columns: ["grader_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      terms: {
        Row: {
          end_date: string | null
          id: string
          name: string | null
          start_date: string | null
          status: string | null
          year: string | null
        }
        Insert: {
          end_date?: string | null
          id: string
          name?: string | null
          start_date?: string | null
          status?: string | null
          year?: string | null
        }
        Update: {
          end_date?: string | null
          id?: string
          name?: string | null
          start_date?: string | null
          status?: string | null
          year?: string | null
        }
        Relationships: []
      }
      test_scores: {
        Row: {
          id: string
          lesson_id: string | null
          post: number | null
          post_answers: Json | null
          pre: number | null
          pre_answers: Json | null
          student_id: string | null
          total: number | null
        }
        Insert: {
          id?: string
          lesson_id?: string | null
          post?: number | null
          post_answers?: Json | null
          pre?: number | null
          pre_answers?: Json | null
          student_id?: string | null
          total?: number | null
        }
        Update: {
          id?: string
          lesson_id?: string | null
          post?: number | null
          post_answers?: Json | null
          pre?: number | null
          pre_answers?: Json | null
          student_id?: string | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "test_scores_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_scores_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_answers: {
        Row: {
          answered_at: string
          attempt_id: string
          chosen: string
          question_id: string
          seq: number
        }
        Insert: {
          answered_at?: string
          attempt_id: string
          chosen: string
          question_id: string
          seq?: number
        }
        Update: {
          answered_at?: string
          attempt_id?: string
          chosen?: string
          question_id?: string
          seq?: number
        }
        Relationships: [
          {
            foreignKeyName: "tutor_answers_attempt_id_fkey"
            columns: ["attempt_id"]
            isOneToOne: false
            referencedRelation: "tutor_attempts"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_attempts: {
        Row: {
          deadline_at: string
          id: string
          lesson_id: string
          question_ids: string[]
          result: Json | null
          score: number | null
          started_at: string
          status: string
          student_id: string
          submitted_at: string | null
          summary: Json | null
          total: number
        }
        Insert: {
          deadline_at: string
          id?: string
          lesson_id: string
          question_ids: string[]
          result?: Json | null
          score?: number | null
          started_at?: string
          status?: string
          student_id: string
          submitted_at?: string | null
          summary?: Json | null
          total: number
        }
        Update: {
          deadline_at?: string
          id?: string
          lesson_id?: string
          question_ids?: string[]
          result?: Json | null
          score?: number | null
          started_at?: string
          status?: string
          student_id?: string
          submitted_at?: string | null
          summary?: Json | null
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "tutor_attempts_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "user_directory"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tutor_attempts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_topics: {
        Row: {
          created_at: string
          id: string
          lesson_id: string
          name: string
        }
        Insert: {
          created_at?: string
          id: string
          lesson_id: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          lesson_id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_topics_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string | null
          group_id: string | null
          id: string
          name: string
          role: string | null
          section: string | null
          student_no: string | null
          study_year: number | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          group_id?: string | null
          id: string
          name: string
          role?: string | null
          section?: string | null
          student_no?: string | null
          study_year?: number | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          group_id?: string | null
          id?: string
          name?: string
          role?: string | null
          section?: string | null
          student_no?: string | null
          study_year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "users_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "subject_groups"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      courses: {
        Row: {
          access: Json | null
          code: string | null
          group_id: string | null
          group_name: string | null
          hero: string | null
          id: string | null
          instructor: string | null
          kind: string | null
          lessons: number | null
          progress: number | null
          section: string | null
          students: number | null
          subtitle: string | null
          term: string | null
          title: string | null
          year: string | null
          year_level: number[] | null
        }
        Insert: {
          access?: Json | null
          code?: string | null
          group_id?: string | null
          group_name?: string | null
          hero?: string | null
          id?: string | null
          instructor?: string | null
          kind?: string | null
          lessons?: number | null
          progress?: number | null
          section?: string | null
          students?: number | null
          subtitle?: string | null
          term?: string | null
          title?: string | null
          year?: string | null
          year_level?: number[] | null
        }
        Update: {
          access?: Json | null
          code?: string | null
          group_id?: string | null
          group_name?: string | null
          hero?: string | null
          id?: string | null
          instructor?: string | null
          kind?: string | null
          lessons?: number | null
          progress?: number | null
          section?: string | null
          students?: number | null
          subtitle?: string | null
          term?: string | null
          title?: string | null
          year?: string | null
          year_level?: number[] | null
        }
        Relationships: []
      }
      questions_student: {
        Row: {
          choices: Json | null
          id: string | null
          kind: string | null
          lesson_id: string | null
          no: number | null
          text: string | null
          type: string | null
        }
        Relationships: []
      }
      user_directory: {
        Row: {
          id: string | null
          name: string | null
          role: string | null
        }
        Insert: {
          id?: string | null
          name?: string | null
          role?: string | null
        }
        Update: {
          id?: string | null
          name?: string | null
          role?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ai_quota_claim: {
        Args: {
          p_course: string
          p_lesson: string
          p_limit: number
          p_mode: string
          p_session: string
          p_student: string
        }
        Returns: {
          claim_id: string
          used: number
        }[]
      }
      current_user_id: { Args: never; Returns: string }
      current_user_role: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      is_instructor: { Args: never; Returns: boolean }
      live_answer_submit: {
        Args: {
          p_chosen: string
          p_idx: number
          p_now: string
          p_session: string
          p_user: string
        }
        Returns: string
      }
      live_is_host: { Args: { p_session: string }; Returns: boolean }
      live_is_player: { Args: { p_session: string }; Returns: boolean }
      live_join_session: {
        Args: { p_name: string; p_session: string; p_user: string }
        Returns: string
      }
      live_join_team: {
        Args: { p_course: string; p_user: string }
        Returns: string
      }
      live_move_player: {
        Args: { p_session: string; p_team: string; p_user: string }
        Returns: string
      }
      live_question_stats: {
        Args: { p_session: string }
        Returns: {
          answered: number
          choice_counts: Json
          correct: number
          idx: number
          team_stats: Json
        }[]
      }
      live_session_advance: {
        Args: {
          p_action: string
          p_host: string
          p_now: string
          p_session: string
        }
        Returns: {
          current_index: number
          phase: string
          status: string
        }[]
      }
      live_session_create: {
        Args: {
          p_course: string
          p_host: string
          p_pin: string
          p_quiz: string
          p_restrict?: boolean
          p_team_mode?: boolean
        }
        Returns: string
      }
      live_session_end: {
        Args: {
          p_expected_index: number
          p_expected_phase: string
          p_session: string
        }
        Returns: string
      }
      live_session_totals: {
        Args: { p_session: string }
        Returns: {
          answered: number
          correct: number
          score: number
          user_id: string
        }[]
      }
      live_standings: {
        Args: { p_session: string; p_user: string }
        Returns: {
          me_rank: number | null
          me_score: number
          me_team_id: string | null
          player_count: number
          teams: Json | null
          top: Json
        }[]
      }
      tutor_answer_save: {
        Args: {
          p_answered_at: string
          p_attempt: string
          p_chosen: string
          p_question: string
          p_seq: number
        }
        Returns: boolean
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
