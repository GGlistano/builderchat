export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type BlockType =
  | 'text'
  | 'question'
  | 'image'
  | 'video'
  | 'audio'
  | 'typing_effect'
  | 'recording_effect'
  | 'delay'
  | 'end';

export type ConversationStatus = 'active' | 'completed' | 'abandoned';

export interface Database {
  public: {
    Tables: {
      funnels: {
        Row: {
          id: string;
          name: string;
          slug: string;
          profile_name: string;
          profile_image: string | null;
          profile_image_url: string | null;
          facebook_pixel_id: string | null;
          facebook_capi_token: string | null;
          facebook_test_event_code: string | null;
          utmify_api_token: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          profile_name: string;
          profile_image?: string | null;
          profile_image_url?: string | null;
          facebook_pixel_id?: string | null;
          facebook_capi_token?: string | null;
          facebook_test_event_code?: string | null;
          utmify_api_token?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          profile_name?: string;
          profile_image?: string | null;
          profile_image_url?: string | null;
          facebook_pixel_id?: string | null;
          facebook_capi_token?: string | null;
          facebook_test_event_code?: string | null;
          utmify_api_token?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      funnel_blocks: {
        Row: {
          id: string;
          funnel_id: string;
          type: BlockType;
          content: Json;
          position_x: number;
          position_y: number;
          order_index: number;
          next_block_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          funnel_id: string;
          type: BlockType;
          content?: Json;
          position_x?: number;
          position_y?: number;
          order_index: number;
          next_block_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          funnel_id?: string;
          type?: BlockType;
          content?: Json;
          position_x?: number;
          position_y?: number;
          order_index?: number;
          next_block_id?: string | null;
          created_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          funnel_id: string;
          current_block_id: string | null;
          status: ConversationStatus;
          lead_data: Json;
          started_at: string;
          completed_at: string | null;
          last_activity_at: string;
        };
        Insert: {
          id?: string;
          funnel_id: string;
          current_block_id?: string | null;
          status?: ConversationStatus;
          lead_data?: Json;
          started_at?: string;
          completed_at?: string | null;
          last_activity_at?: string;
        };
        Update: {
          id?: string;
          funnel_id?: string;
          current_block_id?: string | null;
          status?: ConversationStatus;
          lead_data?: Json;
          started_at?: string;
          completed_at?: string | null;
          last_activity_at?: string;
        };
      };
      lead_responses: {
        Row: {
          id: string;
          conversation_id: string;
          block_id: string;
          response_text: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          block_id: string;
          response_text: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          block_id?: string;
          response_text?: string;
          created_at?: string;
        };
      };
    };
  };
}

export interface BlockContent {
  text?: string;
  mediaUrl?: string;
  duration?: number;
  questionType?: 'text' | 'multiple_choice' | 'email' | 'phone';
  options?: string[];
  validation?: {
    required?: boolean;
    pattern?: string;
  };
}

export type Funnel = Database['public']['Tables']['funnels']['Row'];
export type FunnelBlock = Database['public']['Tables']['funnel_blocks']['Row'];
export type Conversation = Database['public']['Tables']['conversations']['Row'];
export type LeadResponse = Database['public']['Tables']['lead_responses']['Row'];
