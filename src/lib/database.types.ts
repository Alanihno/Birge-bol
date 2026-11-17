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
      answers: {
        Row: {
          approved: boolean
          body: string
          created_at: string
          id: string
          is_demo: boolean
          mentor_id: string | null
          question_id: string
        }
        Insert: {
          approved?: boolean
          body: string
          created_at?: string
          id?: string
          is_demo?: boolean
          mentor_id?: string | null
          question_id: string
        }
        Update: {
          approved?: boolean
          body?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          mentor_id?: string | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "answers_mentor_id_fkey"
            columns: ["mentor_id"]
            isOneToOne: false
            referencedRelation: "mentors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      app_graph_edges: {
        Row: {
          key: string | null
          relation: string
          source: string
          target: string
        }
        Insert: {
          key?: string | null
          relation: string
          source: string
          target: string
        }
        Update: {
          key?: string | null
          relation?: string
          source?: string
          target?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_graph_edges_source_fkey"
            columns: ["source"]
            isOneToOne: false
            referencedRelation: "app_graph_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "app_graph_edges_target_fkey"
            columns: ["target"]
            isOneToOne: false
            referencedRelation: "app_graph_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      app_graph_keywords: {
        Row: {
          keyword: string
          node_id: string
        }
        Insert: {
          keyword: string
          node_id: string
        }
        Update: {
          keyword?: string
          node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_graph_keywords_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "app_graph_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      app_graph_nodes: {
        Row: {
          description: string
          id: string
          kind: string
          label: string
          roles: string[]
          routes: Json
          tables: string[]
          x: number
          y: number
        }
        Insert: {
          description: string
          id: string
          kind: string
          label: string
          roles: string[]
          routes: Json
          tables: string[]
          x: number
          y: number
        }
        Update: {
          description?: string
          id?: string
          kind?: string
          label?: string
          roles?: string[]
          routes?: Json
          tables?: string[]
          x?: number
          y?: number
        }
        Relationships: []
      }
      appointments: {
        Row: {
          child_id: string
          clinic_id: string | null
          contact: string
          created_at: string
          diagnosis: string
          ends_at: string | null
          id: string
          is_demo: boolean
          parent_id: string
          proposed_slot_id: string | null
          reason: string
          service: string
          share_diary: boolean
          slot_id: string | null
          specialist_id: string
          starts_at: string
          status: string
          updated_at: string
          visit_format: string
          visit_verified: boolean
          visited_at: string | null
        }
        Insert: {
          child_id: string
          clinic_id?: string | null
          contact?: string
          created_at?: string
          diagnosis?: string
          ends_at?: string | null
          id?: string
          is_demo?: boolean
          parent_id: string
          proposed_slot_id?: string | null
          reason?: string
          service?: string
          share_diary?: boolean
          slot_id?: string | null
          specialist_id: string
          starts_at: string
          status?: string
          updated_at?: string
          visit_format?: string
          visit_verified?: boolean
          visited_at?: string | null
        }
        Update: {
          child_id?: string
          clinic_id?: string | null
          contact?: string
          created_at?: string
          diagnosis?: string
          ends_at?: string | null
          id?: string
          is_demo?: boolean
          parent_id?: string
          proposed_slot_id?: string | null
          reason?: string
          service?: string
          share_diary?: boolean
          slot_id?: string | null
          specialist_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
          visit_format?: string
          visit_verified?: boolean
          visited_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_child_id_parent_id_fkey"
            columns: ["child_id", "parent_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id", "parent_id"]
          },
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_proposed_slot_id_fkey"
            columns: ["proposed_slot_id"]
            isOneToOne: false
            referencedRelation: "schedule_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_slot_id_fkey"
            columns: ["slot_id"]
            isOneToOne: false
            referencedRelation: "schedule_slots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      care_messages: {
        Row: {
          appointment_id: string
          body: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          appointment_id: string
          body: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          appointment_id?: string
          body?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_messages_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      care_reminders: {
        Row: {
          delivered: boolean
          due_at: string
          id: string
          title: string
          to: string
          user_id: string
        }
        Insert: {
          delivered?: boolean
          due_at: string
          id?: string
          title: string
          to: string
          user_id: string
        }
        Update: {
          delivered?: boolean
          due_at?: string
          id?: string
          title?: string
          to?: string
          user_id?: string
        }
        Relationships: []
      }
      care_team_access: {
        Row: {
          active: boolean
          child_id: string
          created_at: string
          parent_id: string
          specialist_id: string
        }
        Insert: {
          active?: boolean
          child_id: string
          created_at?: string
          parent_id: string
          specialist_id: string
        }
        Update: {
          active?: boolean
          child_id?: string
          created_at?: string
          parent_id?: string
          specialist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "care_team_access_child_id_parent_id_fkey"
            columns: ["child_id", "parent_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id", "parent_id"]
          },
          {
            foreignKeyName: "care_team_access_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
      child_goals: {
        Row: {
          child_id: string
          created_at: string
          due_at: string
          id: string
          metric: string
          parent_id: string
          specialist_id: string | null
          stage: number
          status: string
          target: number
          title: string
        }
        Insert: {
          child_id: string
          created_at?: string
          due_at: string
          id?: string
          metric: string
          parent_id: string
          specialist_id?: string | null
          stage?: number
          status?: string
          target: number
          title: string
        }
        Update: {
          child_id?: string
          created_at?: string
          due_at?: string
          id?: string
          metric?: string
          parent_id?: string
          specialist_id?: string | null
          stage?: number
          status?: string
          target?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "child_goals_child_id_parent_id_fkey"
            columns: ["child_id", "parent_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id", "parent_id"]
          },
          {
            foreignKeyName: "child_goals_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
      children: {
        Row: {
          age: string
          budget: number
          case_group: string
          city: string
          concerns: string[]
          created_at: string
          diagnosis: string
          district: string
          experience: string
          format: string
          id: string
          label: string
          parent_id: string
          updated_at: string
        }
        Insert: {
          age: string
          budget: number
          case_group?: string
          city?: string
          concerns?: string[]
          created_at?: string
          diagnosis?: string
          district: string
          experience: string
          format: string
          id?: string
          label?: string
          parent_id: string
          updated_at?: string
        }
        Update: {
          age?: string
          budget?: number
          case_group?: string
          city?: string
          concerns?: string[]
          created_at?: string
          diagnosis?: string
          district?: string
          experience?: string
          format?: string
          id?: string
          label?: string
          parent_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      clinic_branches: {
        Row: {
          address: string
          clinic_id: string
          district: string
          id: string
          name: string
        }
        Insert: {
          address: string
          clinic_id: string
          district: string
          id?: string
          name: string
        }
        Update: {
          address?: string
          clinic_id?: string
          district?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_branches_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_invitations: {
        Row: {
          clinic_id: string
          email: string
          id: string
          status: string
        }
        Insert: {
          clinic_id: string
          email: string
          id?: string
          status?: string
        }
        Update: {
          clinic_id?: string
          email?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_invitations_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_members: {
        Row: {
          clinic_id: string
          specialist_id: string
          status: string
        }
        Insert: {
          clinic_id: string
          specialist_id: string
          status?: string
        }
        Update: {
          clinic_id?: string
          specialist_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_members_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_members_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string
          contacts: string
          description: string
          district: string
          id: string
          is_demo: boolean
          name: string
          owner_id: string | null
          services: string
          status: string
        }
        Insert: {
          address?: string
          contacts?: string
          description?: string
          district: string
          id?: string
          is_demo?: boolean
          name: string
          owner_id?: string | null
          services?: string
          status?: string
        }
        Update: {
          address?: string
          contacts?: string
          description?: string
          district?: string
          id?: string
          is_demo?: boolean
          name?: string
          owner_id?: string | null
          services?: string
          status?: string
        }
        Relationships: []
      }
      community_preferences: {
        Row: {
          notify_new: boolean
          topics: string[]
          user_id: string
        }
        Insert: {
          notify_new?: boolean
          topics?: string[]
          user_id: string
        }
        Update: {
          notify_new?: boolean
          topics?: string[]
          user_id?: string
        }
        Relationships: []
      }
      community_replies: {
        Row: {
          body: string
          created_at: string
          id: string
          parent_answer_id: string | null
          parent_id: string
          parent_reply_id: string | null
          question_id: string
          status: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          parent_answer_id?: string | null
          parent_id: string
          parent_reply_id?: string | null
          question_id: string
          status?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          parent_answer_id?: string | null
          parent_id?: string
          parent_reply_id?: string | null
          question_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_replies_parent_answer_id_fkey"
            columns: ["parent_answer_id"]
            isOneToOne: false
            referencedRelation: "answers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_replies_parent_reply_id_question_id_fkey"
            columns: ["parent_reply_id", "question_id"]
            isOneToOne: false
            referencedRelation: "community_replies"
            referencedColumns: ["id", "question_id"]
          },
          {
            foreignKeyName: "community_replies_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      consent_records: {
        Row: {
          created_at: string
          granted: boolean
          id: string
          parent_id: string
          purpose: string
          version: string
        }
        Insert: {
          created_at?: string
          granted?: boolean
          id?: string
          parent_id: string
          purpose: string
          version?: string
        }
        Update: {
          created_at?: string
          granted?: boolean
          id?: string
          parent_id?: string
          purpose?: string
          version?: string
        }
        Relationships: []
      }
      content_translations: {
        Row: {
          created_at: string
          source_hash: string
          source_id: string
          source_kind: string
          target_language: string
          translated_text: string
        }
        Insert: {
          created_at?: string
          source_hash: string
          source_id: string
          source_kind: string
          target_language: string
          translated_text: string
        }
        Update: {
          created_at?: string
          source_hash?: string
          source_id?: string
          source_kind?: string
          target_language?: string
          translated_text?: string
        }
        Relationships: []
      }
      districts: {
        Row: {
          city_id: string
          id: string
          name: string
        }
        Insert: {
          city_id: string
          id?: string
          name: string
        }
        Update: {
          city_id?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "districts_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      family_task_links: {
        Row: {
          assignment_id: string
          expires_at: string
          id: string
          parent_id: string
          revoked: boolean
          token_hash: string
        }
        Insert: {
          assignment_id: string
          expires_at: string
          id?: string
          parent_id: string
          revoked?: boolean
          token_hash: string
        }
        Update: {
          assignment_id?: string
          expires_at?: string
          id?: string
          parent_id?: string
          revoked?: boolean
          token_hash?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_task_links_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "task_assignments"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          parent_id: string
          specialist_id: string
        }
        Insert: {
          created_at?: string
          parent_id: string
          specialist_id: string
        }
        Update: {
          created_at?: string
          parent_id?: string
          specialist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
      medical_terms: {
        Row: {
          approved: boolean
          id: string
          is_demo: boolean
          meaning: string
          questions: string[]
          term: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          approved?: boolean
          id?: string
          is_demo?: boolean
          meaning: string
          questions?: string[]
          term: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          approved?: boolean
          id?: string
          is_demo?: boolean
          meaning?: string
          questions?: string[]
          term?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      mentors: {
        Row: {
          alias: string
          approved: boolean
          id: string
          opted_in: boolean
        }
        Insert: {
          alias: string
          approved?: boolean
          id: string
          opted_in?: boolean
        }
        Update: {
          alias?: string
          approved?: boolean
          id?: string
          opted_in?: boolean
        }
        Relationships: []
      }
      message_translations: {
        Row: {
          created_at: string
          message_id: string
          source_hash: string
          target_language: string
          translated_text: string
        }
        Insert: {
          created_at?: string
          message_id: string
          source_hash: string
          target_language: string
          translated_text: string
        }
        Update: {
          created_at?: string
          message_id?: string
          source_hash?: string
          target_language?: string
          translated_text?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_translations_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "care_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          read: boolean
          source_key: string | null
          title: string
          to: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          read?: boolean
          source_key?: string | null
          title: string
          to: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          read?: boolean
          source_key?: string | null
          title?: string
          to?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          contact: string
          created_at: string
          id: string
          language: string
          updated_at: string
        }
        Insert: {
          contact?: string
          created_at?: string
          id: string
          language?: string
          updated_at?: string
        }
        Update: {
          contact?: string
          created_at?: string
          id?: string
          language?: string
          updated_at?: string
        }
        Relationships: []
      }
      progress_entries: {
        Row: {
          created_at: string
          goal_id: string
          id: string
          note: string
          parent_id: string
          value: number
        }
        Insert: {
          created_at?: string
          goal_id: string
          id?: string
          note?: string
          parent_id: string
          value: number
        }
        Update: {
          created_at?: string
          goal_id?: string
          id?: string
          note?: string
          parent_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "progress_entries_goal_id_parent_id_fkey"
            columns: ["goal_id", "parent_id"]
            isOneToOne: false
            referencedRelation: "child_goals"
            referencedColumns: ["id", "parent_id"]
          },
        ]
      }
      qualification_documents: {
        Row: {
          document_url: string
          id: string
          owner_id: string
          status: string
          title: string
        }
        Insert: {
          document_url: string
          id?: string
          owner_id: string
          status?: string
          title: string
        }
        Update: {
          document_url?: string
          id?: string
          owner_id?: string
          status?: string
          title?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          body: string
          city: string
          created_at: string
          id: string
          is_demo: boolean
          parent_id: string | null
          status: string
          title: string
          topic: string
          updated_at: string
        }
        Insert: {
          body: string
          city?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          parent_id?: string | null
          status?: string
          title: string
          topic: string
          updated_at?: string
        }
        Update: {
          body?: string
          city?: string
          created_at?: string
          id?: string
          is_demo?: boolean
          parent_id?: string | null
          status?: string
          title?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      recommendation_rules: {
        Row: {
          approved: boolean
          conditions: Json
          created_at: string
          enabled: boolean
          explanation: string
          id: string
          title: string
          version: string
        }
        Insert: {
          approved?: boolean
          conditions?: Json
          created_at?: string
          enabled?: boolean
          explanation: string
          id?: string
          title: string
          version: string
        }
        Update: {
          approved?: boolean
          conditions?: Json
          created_at?: string
          enabled?: boolean
          explanation?: string
          id?: string
          title?: string
          version?: string
        }
        Relationships: []
      }
      review_reports: {
        Row: {
          created_at: string
          id: string
          parent_id: string
          reason: string
          review_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          parent_id: string
          reason: string
          review_id: string
        }
        Update: {
          created_at?: string
          id?: string
          parent_id?: string
          reason?: string
          review_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_reports_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          appointment_id: string | null
          body: string
          contact: number
          created_at: string
          evidence: string | null
          feedback_id: string | null
          id: string
          is_demo: boolean
          parent_id: string
          specialist_id: string
          status: string
          strengths: string[]
          visit_verified: boolean
        }
        Insert: {
          appointment_id?: string | null
          body: string
          contact: number
          created_at?: string
          evidence?: string | null
          feedback_id?: string | null
          id?: string
          is_demo?: boolean
          parent_id: string
          specialist_id: string
          status?: string
          strengths?: string[]
          visit_verified?: boolean
        }
        Update: {
          appointment_id?: string | null
          body?: string
          contact?: number
          created_at?: string
          evidence?: string | null
          feedback_id?: string | null
          id?: string
          is_demo?: boolean
          parent_id?: string
          specialist_id?: string
          status?: string
          strengths?: string[]
          visit_verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "reviews_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "session_feedback"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_slots: {
        Row: {
          available: boolean
          ends_at: string
          id: string
          price: number
          service: string
          specialist_id: string
          starts_at: string
        }
        Insert: {
          available?: boolean
          ends_at: string
          id?: string
          price: number
          service?: string
          specialist_id: string
          starts_at: string
        }
        Update: {
          available?: boolean
          ends_at?: string
          id?: string
          price?: number
          service?: string
          specialist_id?: string
          starts_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_slots_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
      session_feedback: {
        Row: {
          adaptation: string
          child_id: string
          comfortable: boolean
          contact: number
          created_at: string
          explained: boolean
          goal: boolean
          id: string
          parent_id: string
          specialist_id: string
        }
        Insert: {
          adaptation: string
          child_id: string
          comfortable: boolean
          contact: number
          created_at?: string
          explained: boolean
          goal: boolean
          id?: string
          parent_id: string
          specialist_id: string
        }
        Update: {
          adaptation?: string
          child_id?: string
          comfortable?: boolean
          contact?: number
          created_at?: string
          explained?: boolean
          goal?: boolean
          id?: string
          parent_id?: string
          specialist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_feedback_child_id_parent_id_fkey"
            columns: ["child_id", "parent_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id", "parent_id"]
          },
          {
            foreignKeyName: "session_feedback_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
      specialist_services: {
        Row: {
          age_ranges: string[]
          id: string
          price: number
          specialist_id: string
          stages: string[]
          title: string
        }
        Insert: {
          age_ranges?: string[]
          id?: string
          price: number
          specialist_id: string
          stages?: string[]
          title: string
        }
        Update: {
          age_ranges?: string[]
          id?: string
          price?: number
          specialist_id?: string
          stages?: string[]
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "specialist_services_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
      specialists: {
        Row: {
          address: string | null
          ages: string[]
          city: string
          color: string
          concerns: string[]
          contact_consent: boolean
          contact_rating: number | null
          contact_url: string | null
          created_at: string
          description: string
          district: string
          experience: number
          id: string
          is_demo: boolean
          latitude: number | null
          longitude: number | null
          name: string
          online: boolean
          owner_id: string | null
          price: number
          profile: Json
          published: boolean
          specialty: string
          updated_at: string
          verification_status: string
          verified_count: number
        }
        Insert: {
          address?: string | null
          ages?: string[]
          city: string
          color?: string
          concerns?: string[]
          contact_consent?: boolean
          contact_rating?: number | null
          contact_url?: string | null
          created_at?: string
          description: string
          district: string
          experience: number
          id?: string
          is_demo?: boolean
          latitude?: number | null
          longitude?: number | null
          name: string
          online?: boolean
          owner_id?: string | null
          price: number
          profile?: Json
          published?: boolean
          specialty: string
          updated_at?: string
          verification_status?: string
          verified_count?: number
        }
        Update: {
          address?: string | null
          ages?: string[]
          city?: string
          color?: string
          concerns?: string[]
          contact_consent?: boolean
          contact_rating?: number | null
          contact_url?: string | null
          created_at?: string
          description?: string
          district?: string
          experience?: number
          id?: string
          is_demo?: boolean
          latitude?: number | null
          longitude?: number | null
          name?: string
          online?: boolean
          owner_id?: string | null
          price?: number
          profile?: Json
          published?: boolean
          specialty?: string
          updated_at?: string
          verification_status?: string
          verified_count?: number
        }
        Relationships: []
      }
      specializations: {
        Row: {
          id: string
          name: string
        }
        Insert: {
          id?: string
          name: string
        }
        Update: {
          id?: string
          name?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          body: string
          category: string
          created_at: string
          id: string
          reply: string
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          category: string
          created_at?: string
          id?: string
          reply?: string
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          category?: string
          created_at?: string
          id?: string
          reply?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      task_assignments: {
        Row: {
          child_id: string
          comment: string
          created_at: string
          due_at: string
          duration: number
          frequency: string
          goal_id: string | null
          goal_title: string
          id: string
          material_id: string
          parent_id: string
          specialist_id: string
          status: string
        }
        Insert: {
          child_id: string
          comment?: string
          created_at?: string
          due_at: string
          duration: number
          frequency: string
          goal_id?: string | null
          goal_title?: string
          id?: string
          material_id: string
          parent_id: string
          specialist_id: string
          status?: string
        }
        Update: {
          child_id?: string
          comment?: string
          created_at?: string
          due_at?: string
          duration?: number
          frequency?: string
          goal_id?: string | null
          goal_title?: string
          id?: string
          material_id?: string
          parent_id?: string
          specialist_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_assignments_child_id_parent_id_fkey"
            columns: ["child_id", "parent_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id", "parent_id"]
          },
          {
            foreignKeyName: "task_assignments_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "child_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "task_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_assignments_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completions: {
        Row: {
          assignment_id: string
          child_id: string
          comment: string
          created_at: string
          id: string
          outcome: string
          parent_id: string
          specialist_id: string
        }
        Insert: {
          assignment_id: string
          child_id: string
          comment?: string
          created_at?: string
          id?: string
          outcome: string
          parent_id: string
          specialist_id: string
        }
        Update: {
          assignment_id?: string
          child_id?: string
          comment?: string
          created_at?: string
          id?: string
          outcome?: string
          parent_id?: string
          specialist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "task_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_child_id_fkey"
            columns: ["child_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
      task_materials: {
        Row: {
          author_id: string | null
          captions_kk: string | null
          captions_ru: string | null
          duration: number
          goal: string
          id: string
          is_demo: boolean
          items: string[]
          memo_url: string | null
          rights_confirmed: boolean
          signs: string
          status: string
          steps: string[]
          stop: string
          title: string
          video_url: string | null
        }
        Insert: {
          author_id?: string | null
          captions_kk?: string | null
          captions_ru?: string | null
          duration?: number
          goal: string
          id?: string
          is_demo?: boolean
          items?: string[]
          memo_url?: string | null
          rights_confirmed?: boolean
          signs?: string
          status?: string
          steps?: string[]
          stop?: string
          title: string
          video_url?: string | null
        }
        Update: {
          author_id?: string | null
          captions_kk?: string | null
          captions_ru?: string | null
          duration?: number
          goal?: string
          id?: string
          is_demo?: boolean
          items?: string[]
          memo_url?: string | null
          rights_confirmed?: boolean
          signs?: string
          status?: string
          steps?: string[]
          stop?: string
          title?: string
          video_url?: string | null
        }
        Relationships: []
      }
      team_recommendations: {
        Row: {
          body: string
          child_id: string
          created_at: string
          id: string
          parent_id: string
          specialist_id: string
        }
        Insert: {
          body: string
          child_id: string
          created_at?: string
          id?: string
          parent_id: string
          specialist_id: string
        }
        Update: {
          body?: string
          child_id?: string
          created_at?: string
          id?: string
          parent_id?: string
          specialist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_recommendations_child_id_parent_id_fkey"
            columns: ["child_id", "parent_id"]
            isOneToOne: false
            referencedRelation: "children"
            referencedColumns: ["id", "parent_id"]
          },
          {
            foreignKeyName: "team_recommendations_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          consent: boolean
          created_at: string
          id: string
          parent_id: string
          specialist_id: string
        }
        Insert: {
          consent: boolean
          created_at?: string
          id?: string
          parent_id: string
          specialist_id: string
        }
        Update: {
          consent?: boolean
          created_at?: string
          id?: string
          parent_id?: string
          specialist_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_specialist_id_fkey"
            columns: ["specialist_id"]
            isOneToOne: false
            referencedRelation: "specialists"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      app_navigation_graph: { Args: never; Returns: Json }
      care_book_slot: { Args: { p: Json }; Returns: Json }
      care_calendar_feed: { Args: { p_token: string }; Returns: Json }
      care_calendar_link: { Args: { p_revoke?: boolean }; Returns: Json }
      care_command: { Args: { p?: Json; p_action: string }; Returns: Json }
      care_confirm_qr: {
        Args: { p_appointment_id?: string; p_code: string }
        Returns: Json
      }
      care_ratings: {
        Args: { p_child_id?: string; p_format?: string }
        Returns: Json
      }
      care_set_team_access: {
        Args: {
          p_child_id: string
          p_granted: boolean
          p_specialist_id: string
        }
        Returns: boolean
      }
      care_snapshot: { Args: never; Returns: Json }
      care_specialist_qr: { Args: { p_rotate?: boolean }; Returns: Json }
      care_submit_review: { Args: { p: Json }; Returns: Json }
      care_translation_quota: { Args: { p_user_id: string }; Returns: boolean }
      claim_telegram_event: { Args: { p_update_id: number }; Returns: boolean }
      consume_function_quota: { Args: { p_bucket: string }; Returns: boolean }
      deliver_care_reminders: { Args: never; Returns: undefined }
      family_task: { Args: { p_token: string }; Returns: Json }
      gemini_runtime_config: { Args: never; Returns: Json }
      register_care_role: { Args: { p_role: string }; Returns: string }
      reserve_gemini_budget: { Args: never; Returns: boolean }
      save_synthetic_child: { Args: { p_child: Json }; Returns: string }
      submit_feedback: {
        Args: {
          p_answers: Json
          p_child_id: string
          p_review?: string
          p_specialist_id: string
        }
        Returns: string
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

