// Hand-written equivalent of `supabase gen types typescript --linked`. Each
// table mirrors the corresponding migration in `supabase/migrations/`. The
// canonical source is the linked hosted project; re-run `pnpm db:types` from
// a machine with `supabase link` configured to overwrite this file with the
// fresh dump (it is regenerated as part of Sprint 4's user actions per the
// Sprint Completion Report).
//
// The supabase-js client is type-parameterized over this `Database`. Adding a
// table here exposes it to `client.from("...")` chained queries. Existing
// `lib/rm-api/` helpers cast to local row shapes anyway (see properties.ts'
// `as unknown as PropertyRow[]`), so widening here does not affect them.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      rm_company: {
        Row: {
          id: number;
          name: string;
          legal_name: string | null;
          primary_phone: string | null;
          email: string | null;
          street: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          logo_url: string | null;
        };
        Insert: {
          id: number;
          name: string;
          legal_name?: string | null;
          primary_phone?: string | null;
          email?: string | null;
          street?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          logo_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["rm_company"]["Insert"]>;
        Relationships: [];
      };
      rm_properties: {
        Row: {
          id: number;
          name: string;
          short_name: string | null;
          property_type: string | null;
          email: string | null;
          primary_phone: string | null;
          street: string | null;
          city: string | null;
          state: string | null;
          postal_code: string | null;
          hero_image_url: string | null;
        };
        Insert: {
          id: number;
          name: string;
          short_name?: string | null;
          property_type?: string | null;
          email?: string | null;
          primary_phone?: string | null;
          street?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          hero_image_url?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["rm_properties"]["Insert"]>;
        Relationships: [];
      };
      rm_units: {
        Row: {
          id: number;
          property_id: number | null;
          unit_name: string;
          square_footage: number | null;
          bedrooms: number | null;
          bathrooms: number | null;
          current_market_rent: number | null;
          is_available: boolean | null;
          available_date: string | null;
          primary_image_url: string | null;
          description: string | null;
        };
        Insert: {
          id: number;
          property_id?: number | null;
          unit_name: string;
          square_footage?: number | null;
          bedrooms?: number | null;
          bathrooms?: number | null;
          current_market_rent?: number | null;
          is_available?: boolean | null;
          available_date?: string | null;
          primary_image_url?: string | null;
          description?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["rm_units"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "rm_units_property_id_fkey";
            columns: ["property_id"];
            referencedRelation: "rm_properties";
            referencedColumns: ["id"];
          },
        ];
      };
      rm_unit_images: {
        Row: {
          id: number;
          unit_id: number;
          image_url: string;
          display_order: number;
        };
        Insert: {
          id?: number;
          unit_id: number;
          image_url: string;
          display_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["rm_unit_images"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "rm_unit_images_unit_id_fkey";
            columns: ["unit_id"];
            referencedRelation: "rm_units";
            referencedColumns: ["id"];
          },
        ];
      };
      rm_property_amenities: {
        Row: {
          id: number;
          property_id: number;
          amenity: string;
        };
        Insert: {
          id?: number;
          property_id: number;
          amenity: string;
        };
        Update: Partial<Database["public"]["Tables"]["rm_property_amenities"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "rm_property_amenities_property_id_fkey";
            columns: ["property_id"];
            referencedRelation: "rm_properties";
            referencedColumns: ["id"];
          },
        ];
      };
      rm_unit_amenities: {
        Row: {
          id: number;
          unit_id: number;
          amenity: string;
        };
        Insert: {
          id?: number;
          unit_id: number;
          amenity: string;
        };
        Update: Partial<Database["public"]["Tables"]["rm_unit_amenities"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "rm_unit_amenities_unit_id_fkey";
            columns: ["unit_id"];
            referencedRelation: "rm_units";
            referencedColumns: ["id"];
          },
        ];
      };
      sites: {
        Row: {
          id: string;
          slug: string;
          owner_id: string | null;
          name: string;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          owner_id?: string | null;
          name: string;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["sites"]["Insert"]>;
        Relationships: [];
      };
      site_versions: {
        Row: {
          id: string;
          site_id: string | null;
          config: Json;
          created_by: string | null;
          source: string | null;
          created_at: string | null;
          is_working: boolean | null;
          is_deployed: boolean | null;
          parent_version_id: string | null;
        };
        Insert: {
          id?: string;
          site_id?: string | null;
          config: Json;
          created_by?: string | null;
          source?: string | null;
          created_at?: string | null;
          is_working?: boolean | null;
          is_deployed?: boolean | null;
          parent_version_id?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["site_versions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "site_versions_site_id_fkey";
            columns: ["site_id"];
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "site_versions_parent_version_id_fkey";
            columns: ["parent_version_id"];
            referencedRelation: "site_versions";
            referencedColumns: ["id"];
          },
        ];
      };
      form_submissions: {
        Row: {
          id: number;
          site_id: string | null;
          form_id: string;
          page_slug: string | null;
          submitted_data: Json;
          submitter_ip: string | null;
          user_agent: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          site_id?: string | null;
          form_id: string;
          page_slug?: string | null;
          submitted_data: Json;
          submitter_ip?: string | null;
          user_agent?: string | null;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["form_submissions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "form_submissions_site_id_fkey";
            columns: ["site_id"];
            referencedRelation: "sites";
            referencedColumns: ["id"];
          },
        ];
      };
      demo_fixtures: {
        Row: {
          id: number;
          surface: string;
          input_hash: string;
          response: Json;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          surface: string;
          input_hash: string;
          response: Json;
          created_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["demo_fixtures"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
