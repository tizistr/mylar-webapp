import { supabase } from "../supabase.js";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

// Configure dayjs to handle timezones
dayjs.extend(utc);
dayjs.extend(timezone);

// Get user's timezone or default to UTC
const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

export class RosterApi {
  static async checkDatabaseStructure() {
    try {
      console.log("[RosterApi] Checking database structure");

      // Just check if we can query the shifts table
      const { data: shifts, error: shiftsError } = await supabase
        .from("shifts")
        .select("*")
        .limit(1);

      if (shiftsError) {
        console.error("[RosterApi] Error querying shifts table:", shiftsError);
        throw shiftsError;
      }

      // Log the structure of the first row if available
      if (shifts && shifts.length > 0) {
        console.log(
          "[RosterApi] Shifts table structure:",
          Object.keys(shifts[0])
        );
        console.log("[RosterApi] Sample shift data:", shifts[0]);
      } else {
        console.log("[RosterApi] Shifts table exists but is empty");
      }

      return true;
    } catch (error) {
      console.error("[RosterApi] Database structure check failed:", error);
      throw error;
    }
  }

  static async getShifts(startDate, endDate) {
    try {
      console.log("[RosterApi] Raw date range:", {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      // Format dates for query
      const formattedStartDate = dayjs(startDate)
        .startOf("day")
        .format("YYYY-MM-DD");
      const formattedEndDate = dayjs(endDate).endOf("day").format("YYYY-MM-DD");

      console.log("[RosterApi] Formatted date range:", {
        formattedStartDate,
        formattedEndDate,
      });

      // First check if we can query the shifts table
      const { data: testShift, error: testError } = await supabase
        .from("shifts")
        .select("*")
        .limit(1);

      console.log("[RosterApi] Test query result:", { testShift, testError });

      const { data: shifts, error } = await supabase
        .from("shifts")
        .select("*")
        .gte("shift_date", formattedStartDate)
        .lte("shift_date", formattedEndDate)
        .order("shift_date", { ascending: true });

      if (error) {
        console.error("[RosterApi] Error fetching shifts:", error);
        throw error;
      }

      console.log("[RosterApi] Raw shifts from database:", shifts);

      if (!shifts || shifts.length === 0) {
        console.log("[RosterApi] No shifts found for date range");
        return [];
      }

      // Process shifts to ensure proper date formatting
      const processedShifts = shifts.map((shift) => {
        const processed = {
          ...shift,
          shift_date: dayjs(shift.shift_date).format("YYYY-MM-DD"),
        };
        console.log("[RosterApi] Processed shift:", processed);
        return processed;
      });

      console.log("[RosterApi] All processed shifts:", processedShifts);
      return processedShifts;
    } catch (error) {
      console.error("[RosterApi] Error in getShifts:", error);
      throw error;
    }
  }

  static async addShift(shiftData) {
    try {
      console.log("[RosterApi] Adding new shift:", shiftData);

      // Format dates for insertion
      const formattedShift = {
        ...shiftData,
        shift_date: dayjs(shiftData.shift_date).format("YYYY-MM-DD"),
        updated_at: dayjs().format(),
      };

      // Remove shift_start and shift_end if present
      delete formattedShift.shift_start;
      delete formattedShift.shift_end;

      console.log("[RosterApi] Formatted shift data:", formattedShift);

      const { data: shift, error } = await supabase
        .from("shifts")
        .insert([formattedShift])
        .select()
        .single();

      if (error) {
        console.error("[RosterApi] Error adding shift:", error);
        throw error;
      }

      console.log("[RosterApi] Successfully added shift:", shift);
      return shift;
    } catch (error) {
      console.error("[RosterApi] Error in addShift:", error);
      throw error;
    }
  }

  static async updateShift(shiftId, shiftData) {
    try {
      console.log(
        "[RosterApi] Updating shift:",
        shiftId,
        "with data:",
        shiftData
      );

      // Only include fields that are actually being updated
      const formattedShift = { ...shiftData, updated_at: dayjs().format() };
      // Only format shift_date if it is present
      if (shiftData.shift_date !== undefined) {
        formattedShift.shift_date = dayjs(shiftData.shift_date).format(
          "YYYY-MM-DD"
        );
      } else {
        delete formattedShift.shift_date;
      }
      // Remove shift_start and shift_end if present
      delete formattedShift.shift_start;
      delete formattedShift.shift_end;

      console.log("[RosterApi] Formatted update data:", formattedShift);

      const { data: shift, error } = await supabase
        .from("shifts")
        .update(formattedShift)
        .eq("id", shiftId)
        .select()
        .single();

      if (error) {
        console.error("[RosterApi] Error updating shift:", error);
        throw error;
      }

      console.log("[RosterApi] Successfully updated shift:", shift);
      return shift;
    } catch (error) {
      console.error("[RosterApi] Error in updateShift:", error);
      throw error;
    }
  }

  static async deleteShift(shiftId) {
    try {
      console.log("Deleting shift:", shiftId);

      const { error } = await supabase
        .from("shifts")
        .delete()
        .eq("id", shiftId);

      if (error) {
        console.error("Error deleting shift:", error);
        throw error;
      }

      console.log("Successfully deleted shift:", shiftId);
      return true;
    } catch (error) {
      console.error("Error in deleteShift:", error);
      throw error;
    }
  }

  static async getEmployees() {
    // Return hardcoded list of employees for now
    return [
      { id: "1", name: "Toti" },
      { id: "2", name: "Tizi" },
    ];
  }

  // Time Logs API Methods
  static async getTimeLogs({ startDate, endDate, workerName }) {
    console.log(
      `[RosterApi] Getting time logs for range: ${startDate} to ${endDate}${
        workerName ? `, worker: ${workerName}` : ""
      }`
    );

    try {
      let query = supabase
        .from("time_logs")
        .select("*, project:project_id(name, description)")
        .gte("log_date", startDate)
        .lte("log_date", endDate)
        .order("log_date", { ascending: true });

      // Filter by worker if provided
      if (workerName) {
        query = query.eq("worker_name", workerName);
      }

      const { data, error } = await query;

      if (error) {
        console.error("[RosterApi] Error fetching time logs:", error);
        return { data: null, error };
      }

      // Process logs to format dates and map fields properly
      const processedLogs = data.map((log) => {
        const processedLog = {
          ...log,
          log_date: new Date(log.log_date).toISOString().split("T")[0],
          hours_worked: log.hours_worked || 0,
          activity_description: log.activity_description || "",
          project: log.project || { name: "Unknown Project", description: "" },
        };

        delete processedLog.project; // Remove the nested project object
        return processedLog;
      });

      console.log(`[RosterApi] Retrieved ${data.length} time logs`);
      return { data: processedLogs, error: null };
    } catch (error) {
      console.error("[RosterApi] Exception in getTimeLogs:", error);
      return { data: null, error };
    }
  }

  static async addTimeLog(timeLogData) {
    try {
      console.log("[RosterApi] Adding new time log:", timeLogData);

      const formattedLog = {
        worker_name: timeLogData.worker_name,
        log_date: new Date(timeLogData.log_date).toISOString().split("T")[0],
        hours_worked: parseFloat(timeLogData.hours_worked),
        project_id: timeLogData.project_id,
        activity_description: timeLogData.activity_description,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log("[RosterApi] Formatted log data:", formattedLog);

      const { data, error } = await supabase
        .from("time_logs")
        .insert([formattedLog])
        .select()
        .single();

      if (error) {
        console.error("[RosterApi] Error adding time log:", error);
        return { error };
      }

      console.log("[RosterApi] Successfully added time log:", data);
      return { data };
    } catch (error) {
      console.error("[RosterApi] Error in addTimeLog:", error);
      return { error };
    }
  }

  static async updateTimeLog(logId, timeLogData) {
    try {
      console.log(
        "[RosterApi] Updating time log:",
        logId,
        "with data:",
        timeLogData
      );

      const formattedLog = {
        updated_at: new Date().toISOString(),
      };

      if (timeLogData.log_date) {
        formattedLog.log_date = new Date(timeLogData.log_date)
          .toISOString()
          .split("T")[0];
      }

      if (timeLogData.hours_worked !== undefined) {
        formattedLog.hours_worked = parseFloat(timeLogData.hours_worked);
      }

      if (timeLogData.project_id) {
        formattedLog.project_id = timeLogData.project_id;
      }

      if (timeLogData.activity_description) {
        formattedLog.activity_description = timeLogData.activity_description;
      }

      console.log("[RosterApi] Formatted update data:", formattedLog);

      const { data, error } = await supabase
        .from("time_logs")
        .update(formattedLog)
        .eq("id", logId)
        .select()
        .single();

      if (error) {
        console.error("[RosterApi] Error updating time log:", error);
        return { error };
      }

      console.log("[RosterApi] Successfully updated time log:", data);
      return { data };
    } catch (error) {
      console.error("[RosterApi] Error in updateTimeLog:", error);
      return { error };
    }
  }

  static async deleteTimeLog(logId) {
    try {
      console.log("[RosterApi] Deleting time log:", logId);

      const { data, error } = await supabase
        .from("time_logs")
        .delete()
        .eq("id", logId)
        .select()
        .single();

      if (error) {
        console.error("[RosterApi] Error deleting time log:", error);
        return { error };
      }

      console.log("[RosterApi] Successfully deleted time log:", data);
      return { data };
    } catch (error) {
      console.error("[RosterApi] Error in deleteTimeLog:", error);
      return { error };
    }
  }

  static async getProjects() {
    try {
      const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .order("name", { ascending: true });

      if (error) {
        console.error("[RosterApi] Error fetching projects:", error);
        throw error;
      }

      return projects || [];
    } catch (error) {
      console.error("[RosterApi] Error in getProjects:", error);
      throw error;
    }
  }

  static async checkTablesExist() {
    console.log("Checking if tables exist...");

    try {
      // Check if shifts table exists
      const { data: shifts, error: shiftError } = await supabase
        .from("shifts")
        .select("id")
        .limit(1);

      if (shiftError) {
        console.error("Error checking shifts table:", shiftError);
        return { success: false, error: shiftError };
      }

      // Check if time_logs table exists
      const { data: timeLogs, error: timeLogError } = await supabase
        .from("time_logs")
        .select("id")
        .limit(1);

      const timeLogsExist = !timeLogError;

      return {
        success: true,
        shiftsExist: true,
        timeLogsExist,
      };
    } catch (error) {
      console.error("Error checking tables:", error);
      return { success: false, error };
    }
  }
}

export const rosterApi = RosterApi;
