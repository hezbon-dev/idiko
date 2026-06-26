const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://idiko.onrender.com";

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

  async createRecord() {
    throw new Error("createRecord() not implemented yet");
  },

  async updateRecordStatus() {
    throw new Error("updateRecordStatus() not implemented yet");
  },

  async moveToTrash() {
    throw new Error("moveToTrash() not implemented yet");
  },

  async restoreRecord() {
    throw new Error("restoreRecord() not implemented yet");
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