// src/services/RecordService.ts
import { StorageService }from "./StorageService";

const API_URL =import.meta.env.VITE_API_URL ||"https://idiko.onrender.com";

const getHeaders = () => {
  const token = localStorage.getItem(
    "idiko_admin_token"
  );

  return {
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

export const RecordService = {

  /*
   * ==========================
   * RECORDS
   * ==========================
   */

  async getRecords() {

    const response =
      await fetch(
        `${API_URL}/admin/records`,
        {
          headers: getHeaders(),
        }
      );

    const data =
      await response.json();

    if (!data.success) {

      throw new Error(
        "Failed to load records"
      );

    }

    return data.records;

  },

async getStaffRecords() {

  const token =
    await StorageService.get(
      "staffToken"
    );

  const response =
    await fetch(
      `${API_URL}/staff/records`,
      {
        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },
      }
    );

  const data =
    await response.json();

  if (!data.success) {

    throw new Error(
      "Failed to load staff records"
    );

  }

  return data.records;

},

async createRecord(record: any) {

  const response =
    await fetch(
      `${API_URL}/admin/records`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          record,
        }),
      }
    );

  const data =
    await response.json();

  if (!data.success) {

    throw new Error(
      "Failed to create record"
    );

  }

},

  async updateRecordStatus() {
    throw new Error("updateRecordStatus() not implemented yet");
  },

async moveToTrash(
  record: any,
  user: "admin" | "staff"
) {

  const isAdmin =
    user === "admin";

  const token =
    isAdmin
      ? localStorage.getItem(
          "idiko_admin_token"
        )
      : await StorageService.get(
          "staffToken"
        );

  const endpoint =
    isAdmin
      ? `${API_URL}/admin/move-to-trash`
      : `${API_URL}/staff/move-to-trash`;

  const response =
    await fetch(
      endpoint,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify({
          record,
        }),
      }
    );

  const data =
    await response.json();

  if (!data.success) {

    throw new Error(
      data.error ||
      "Failed to move record to trash"
    );

  }

},

async restoreRecord(
  record: any,
  user: "admin" | "staff"
) {

  const isAdmin =
    user === "admin";

  const token =
    isAdmin
      ? localStorage.getItem(
          "idiko_admin_token"
        )
      : await StorageService.get(
          "staffToken"
        );

  const endpoint =
    isAdmin
      ? `${API_URL}/admin/trash/restore`
      : `${API_URL}/staff/trash/restore`;

  const response =
    await fetch(
      endpoint,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },

        body: JSON.stringify({
          record,
        }),
      }
    );

  const data =
    await response.json();

  if (!data.success) {

    throw new Error(
      data.error ||
      "Failed to restore record"
    );

  }

},

  async deleteRecord() {
    throw new Error("deleteRecord() not implemented yet");
  },

  /*
   * ==========================
   * HISTORY
   * ==========================
   */

async getHistoryRecords() {

  const response =
    await fetch(
      `${API_URL}/admin/history-records`,
      {
        headers: getHeaders(),
      }
    );

  const data =
    await response.json();

  if (!data.success) {

    throw new Error(
      "Failed to load history records"
    );

  }

  return data.records;

},

  /*
   * ==========================
   * TRASH
   * ==========================
   */

  async getTrashRecords() {

    const response =
      await fetch(
        `${API_URL}/admin/trash`,
        {
          headers: getHeaders(),
        }
      );

    const data =
      await response.json();

    if (!data.success) {

      throw new Error(
        "Failed to load trash"
      );

    }

    return data.trash;

  },

async getStaffTrashRecords() {

  const token =
    await StorageService.get(
      "staffToken"
    );

  const response =
    await fetch(
      `${API_URL}/staff/trash`,
      {
        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${token}`,
        },
      }
    );

  const data =
    await response.json();

  if (!data.success) {

    throw new Error(
      "Failed to load staff trash"
    );

  }

  return data.trash;

},

  /*
   * ==========================
   * NOTIFY REQUESTS
   * ==========================
   */

  async getNotifyRequests() {

    const response =
      await fetch(
        `${API_URL}/admin/notify-requests`,
        {
          headers: getHeaders(),
        }
      );

    const data =
      await response.json();

    if (!data.success) {

      throw new Error(
        "Failed to load notify requests"
      );

    }

    return data.requests;

  },

  async addNotifyRequest() {
    throw new Error("addNotifyRequest() not implemented yet");
  },

  async updateNotifyRequest() {
    throw new Error("updateNotifyRequest() not implemented yet");
  }

};