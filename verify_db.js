import { supabase } from "./supabase.js";

async function setupDatabase() {
  try {
    console.log("Setting up database...");

    // Create shifts table
    const { error: createError } = await supabase.rpc("create_shifts_table", {
      sql: `
        CREATE TABLE IF NOT EXISTS shifts (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          worker_name TEXT NOT NULL,
          shift_type TEXT NOT NULL,
          shift_date DATE NOT NULL,
          is_working BOOLEAN DEFAULT true,
          notes TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `,
    });

    if (createError) {
      console.error("Error creating shifts table:", createError);
      return;
    }

    console.log("Shifts table created successfully");

    // Try to insert a test shift
    const testShift = {
      worker_name: "Test Worker",
      shift_type: "day",
      shift_date: new Date().toISOString().split("T")[0],
      notes: "Test shift",
    };

    const { data: insertedShift, error: insertError } = await supabase
      .from("shifts")
      .insert([testShift])
      .select();

    if (insertError) {
      console.error("Error inserting test shift:", insertError);
    } else {
      console.log("Successfully inserted test shift:", insertedShift);

      // Clean up test data
      await supabase.from("shifts").delete().eq("id", insertedShift[0].id);
    }

    // Try to query the shifts table
    const { data: shifts, error: queryError } = await supabase
      .from("shifts")
      .select("*")
      .limit(1);

    if (queryError) {
      console.error("Error querying shifts:", queryError);
    } else {
      console.log("Successfully queried shifts table:", shifts);
    }
  } catch (error) {
    console.error("Database setup failed:", error);
  }
}

setupDatabase();
