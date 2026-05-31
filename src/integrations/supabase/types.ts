export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      conversations: {
        Row: {
          context_pet_id: string | null;
          created_at: string;
          id: string;
          kind: string;
          user_a_id: string;
          user_b_id: string;
        };
        Insert: {
          context_pet_id?: string | null;
          created_at?: string;
          id?: string;
          kind: string;
          user_a_id: string;
          user_b_id: string;
        };
        Update: {
          context_pet_id?: string | null;
          created_at?: string;
          id?: string;
          kind?: string;
          user_a_id?: string;
          user_b_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "conversations_context_pet_id_fkey";
            columns: ["context_pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
        ];
      };
      matches: {
        Row: {
          created_at: string;
          id: string;
          pet_a_id: string;
          pet_b_id: string;
          user_a_id: string;
          user_b_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          pet_a_id: string;
          pet_b_id: string;
          user_a_id: string;
          user_b_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          pet_a_id?: string;
          pet_b_id?: string;
          user_a_id?: string;
          user_b_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "matches_pet_a_id_fkey";
            columns: ["pet_a_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "matches_pet_b_id_fkey";
            columns: ["pet_b_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
        ];
      };
      messages: {
        Row: {
          body: string;
          conversation_id: string;
          created_at: string;
          id: string;
          sender_id: string;
        };
        Insert: {
          body: string;
          conversation_id: string;
          created_at?: string;
          id?: string;
          sender_id: string;
        };
        Update: {
          body?: string;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          sender_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey";
            columns: ["conversation_id"];
            isOneToOne: false;
            referencedRelation: "conversations";
            referencedColumns: ["id"];
          },
        ];
      };
      pets: {
        Row: {
          age: number | null;
          bio: string | null;
          breed: string | null;
          city: string | null;
          created_at: string;
          description: string | null;
          gender: string | null;
          id: string;
          name: string;
          owner_id: string;
          photos: string[];
          price: number | null;
          show_in_adoption: boolean;
          show_in_marketplace: boolean;
          show_in_mating: boolean;
          species: string;
          updated_at: string;
        };
        Insert: {
          age?: number | null;
          bio?: string | null;
          breed?: string | null;
          city?: string | null;
          created_at?: string;
          description?: string | null;
          gender?: string | null;
          id?: string;
          name: string;
          owner_id: string;
          photos?: string[];
          price?: number | null;
          show_in_adoption?: boolean;
          show_in_marketplace?: boolean;
          show_in_mating?: boolean;
          species?: string;
          updated_at?: string;
        };
        Update: {
          age?: number | null;
          bio?: string | null;
          breed?: string | null;
          city?: string | null;
          created_at?: string;
          description?: string | null;
          gender?: string | null;
          id?: string;
          name?: string;
          owner_id?: string;
          photos?: string[];
          price?: number | null;
          show_in_adoption?: boolean;
          show_in_marketplace?: boolean;
          show_in_mating?: boolean;
          species?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          city: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          organization_name: string | null;
          updated_at: string;
          user_type: string;
          verified: boolean;
        };
        Insert: {
          city?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          organization_name?: string | null;
          updated_at?: string;
          user_type: string;
          verified?: boolean;
        };
        Update: {
          city?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          organization_name?: string | null;
          updated_at?: string;
          user_type?: string;
          verified?: boolean;
        };
        Relationships: [];
      };
      sales: {
        Row: {
          buyer_id: string;
          commission: number;
          conversation_id: string;
          created_at: string;
          id: string;
          kind: string;
          pet_id: string;
          sale_price: number;
          seller_id: string;
        };
        Insert: {
          buyer_id: string;
          commission: number;
          conversation_id: string;
          created_at?: string;
          id?: string;
          kind: string;
          pet_id: string;
          sale_price: number;
          seller_id: string;
        };
        Update: {
          buyer_id?: string;
          commission?: number;
          conversation_id?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          pet_id?: string;
          sale_price?: number;
          seller_id?: string;
        };
        Relationships: [];
      };
      swipes: {
        Row: {
          created_at: string;
          direction: string;
          id: string;
          swiper_pet_id: string;
          swiper_user_id: string;
          target_pet_id: string;
        };
        Insert: {
          created_at?: string;
          direction: string;
          id?: string;
          swiper_pet_id: string;
          swiper_user_id: string;
          target_pet_id: string;
        };
        Update: {
          created_at?: string;
          direction?: string;
          id?: string;
          swiper_pet_id?: string;
          swiper_user_id?: string;
          target_pet_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "swipes_swiper_pet_id_fkey";
            columns: ["swiper_pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "swipes_target_pet_id_fkey";
            columns: ["target_pet_id"];
            isOneToOne: false;
            referencedRelation: "pets";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
