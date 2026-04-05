// ============================================================
// STORAGE.JS — Firebase Storage helpers
// ============================================================

const StorageService = {
  /**
   * Upload a photo file and return the download URL.
   * @param {File} file
   * @param {string} path  e.g. 'students/abc123'
   * @returns {Promise<string>} download URL
   */
  async uploadPhoto(file, path) {
    const ref = firebase.storage().ref(path);
    const snapshot = await ref.put(file);
    return snapshot.ref.getDownloadURL();
  },

  async deletePhoto(url) {
    try {
      const ref = firebase.storage().refFromURL(url);
      await ref.delete();
    } catch (e) {
      // ignore — file may not exist
    }
  }
};

window.StorageService = StorageService;
