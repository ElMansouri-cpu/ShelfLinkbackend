import { Injectable } from "@nestjs/common";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

@Injectable()
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_KEY!
    );
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  async getUserById(id: string) {
    const { data, error } = await this.supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data;
  }
}
