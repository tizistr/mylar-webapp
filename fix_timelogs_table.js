import { supabase } from "./supabase.js";

async function fixTimeLogsTable() {
  try {
    console.log("Checking time_logs table...");

    // Check if time_logs table exists
    const { data: existingTables, error: tablesError } = await supabase
      .from("pg_tables")
      .select("tablename")
      .eq("schemaname", "public");

    if (tablesError) {
      console.error("Error checking tables:", tablesError);
      // If we can't check tables directly, try a different approach
      try {
        const { error: testError } = await supabase
          .from("time_logs")
          .select("id")
          .limit(1);

        if (testError && testError.code === "42P01") {
          console.log("time_logs table does not exist, creating it...");
          await createTimeLogsTable();
        } else {
          console.log("time_logs table exists, checking structure...");
          await verifyTimeLogsStructure();
        }
      } catch (err) {
        console.error("Error testing time_logs table:", err);
        await createTimeLogsTable();
      }
    } else {
      // Check if time_logs exists in the tables list
      const timeLogsExists = existingTables.some(
        (table) => table.tablename === "time_logs"
      );

      if (!timeLogsExists) {
        console.log("time_logs table does not exist, creating it...");
        await createTimeLogsTable();
      } else {
        console.log("time_logs table exists, checking structure...");
        await verifyTimeLogsStructure();
      }
    }

    console.log("time_logs table check complete!");
  } catch (error) {
    console.error("Error fixing time_logs table:", error);
  }
}

async function createTimeLogsTable() {
  try {
    // Create the time_logs table using SQL
    const { error } = await supabase.rpc("execute_sql", {
      sql: `
        -- Drop the table if it exists
        DROP TABLE IF EXISTS time_logs CASCADE;
        
        -- Create the time_logs table
        CREATE TABLE time_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          worker_name TEXT NOT NULL,
          log_date DATE NOT NULL,
          start_time TIMESTAMPTZ NOT NULL,
          end_time TIMESTAMPTZ NOT NULL,
          hours_worked NUMERIC(5,2) NOT NULL,
          project_id UUID REFERENCES projects(id),
          activity_description TEXT NOT NULL,
          status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        -- Enable Row Level Security
        ALTER TABLE time_logs ENABLE ROW LEVEL SECURITY;
        
        -- Create RLS policy
        CREATE POLICY "Enable all operations for authenticated users" ON time_logs
          FOR ALL
          TO authenticated
          USING (true)
          WITH CHECK (true);
          
        -- Insert some sample time logs for testing
        INSERT INTO time_logs (worker_name, log_date, start_time, end_time, hours_worked, project_id, activity_description, status)
        VALUES
          (
            'Toti', 
            CURRENT_DATE - 1, 
            CURRENT_DATE - 1 + INTERVAL '9 hours', 
            CURRENT_DATE - 1 + INTERVAL '17 hours', 
            8.0,
            (SELECT id FROM projects WHERE name = 'Alpine Metamorphism' LIMIT 1),
            'Lab sample preparation and analysis',
            'approved'
          ),
          (
            'Tizi', 
            CURRENT_DATE - 1, 
            CURRENT_DATE - 1 + INTERVAL '10 hours', 
            CURRENT_DATE - 1 + INTERVAL '18 hours', 
            8.0,
            (SELECT id FROM projects WHERE name = 'Volcanic Activity' LIMIT 1),
            'Data analysis and report writing',
            'pending'
          ),
          (
            'Toti', 
            CURRENT_DATE, 
            CURRENT_DATE + INTERVAL '9 hours', 
            CURRENT_DATE + INTERVAL '17 hours', 
            8.0,
            (SELECT id FROM projects WHERE name = 'Alpine Metamorphism' LIMIT 1),
            'Team meeting and project planning',
            'pending'
          );
      `,
    });

    if (error) {
      console.error("Error creating time_logs table:", error);
      throw error;
    }

    console.log("time_logs table created successfully");
  } catch (error) {
    console.error("Failed to create time_logs table:", error);
    throw error;
  }
}

async function verifyTimeLogsStructure() {
  try {
    // Check if the table has the expected columns
    const { data: columns, error: columnsError } = await supabase
      .from("information_schema.columns")
      .select("column_name")
      .eq("table_name", "time_logs")
      .eq("table_schema", "public");

    if (columnsError) {
      console.error("Error checking time_logs columns:", columnsError);
      // Try a more basic approach - test inserting data
      await testTimeLogsFunctionality();
      return;
    }

    // Check expected columns
    const expectedColumns = [
      "id",
      "worker_name",
      "log_date",
      "start_time",
      "end_time",
      "hours_worked",
      "project_id",
      "activity_description",
      "status",
      "created_at",
      "updated_at",
    ];

    const columnNames = columns.map((col) => col.column_name);
    const missingColumns = expectedColumns.filter(
      (col) => !columnNames.includes(col)
    );

    if (missingColumns.length > 0) {
      console.log("time_logs table is missing columns:", missingColumns);
      await createTimeLogsTable(); // Recreate the table
    } else {
      console.log("time_logs table structure looks good");
      await testTimeLogsFunctionality();
    }
  } catch (error) {
    console.error("Error verifying time_logs structure:", error);
  }
}

async function testTimeLogsFunctionality() {
  try {
    // Try to insert a test record
    const testLog = {
      worker_name: "Test Worker",
      log_date: new Date().toISOString().split("T")[0],
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 3600000).toISOString(), // 1 hour later
      hours_worked: 1.0,
      project_id: null,
      activity_description: "Test log entry",
      status: "pending",
    };

    const { data: inserted, error: insertError } = await supabase
      .from("time_logs")
      .insert([testLog])
      .select();

    if (insertError) {
      console.error("Error inserting test time log:", insertError);
      await createTimeLogsTable(); // Recreate the table
      return;
    }

    console.log("Test time log inserted successfully:", inserted);

    // Clean up test data
    if (inserted && inserted.length > 0) {
      await supabase.from("time_logs").delete().eq("id", inserted[0].id);

      console.log("Test time log cleaned up");
    }
  } catch (error) {
    console.error("Error testing time_logs functionality:", error);
  }
}

// Execute the fix
fixTimeLogsTable();
