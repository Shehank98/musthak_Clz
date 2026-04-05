// ============================================================
// AUTH.JS — Firebase Auth helpers
// ============================================================

const AuthService = {
  async signIn(email, password) {
    return firebase.auth().signInWithEmailAndPassword(email, password);
  },

  async signOut() {
    return firebase.auth().signOut();
  },

  getCurrentUser() {
    return firebase.auth().currentUser;
  },

  onAuthChanged(callback) {
    return firebase.auth().onAuthStateChanged(callback);
  },

  async changePassword(newPassword) {
    const user = firebase.auth().currentUser;
    if (!user) throw new Error('Not authenticated');
    return user.updatePassword(newPassword);
  },

  async createAdmin(email, password) {
    return firebase.auth().createUserWithEmailAndPassword(email, password);
  }
};

window.AuthService = AuthService;
