// ─── Hub API service (REST) ───────────────────────────────────────────────────

async function api(path: string, options: RequestInit = {}) {
  const res = await fetch(path, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? `API error ${res.status}`);
  }
  return res.json();
}

// ─── Service ─────────────────────────────────────────────────────────────────

export const firebaseService = {

  async testConnection() { return true; },

  // ── Dados públicos do site ────────────────────────────────────────────────

  async getSiteData() {
    try {
      return await api('/api/hub/site-data');
    } catch (err) {
      console.error('getSiteData error:', err);
      return null;
    }
  },

  subscribeToSiteData(_onChange: () => void) { return () => {}; },

  // ── Matrículas ────────────────────────────────────────────────────────────

  async createEnrollment(enrollment: any) {
    return api('/api/hub/enrollments', { method: 'POST', body: JSON.stringify(enrollment) });
  },

  async getAllEnrollments() {
    try { return await api('/api/hub/admin/enrollments'); } catch { return []; }
  },

  async updateEnrollmentStatus(id: string, status: string) {
    return api(`/api/hub/admin/enrollments/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
  },

  async deleteEnrollment(id: string) {
    return api(`/api/hub/admin/enrollments/${id}`, { method: 'DELETE' });
  },

  // ── Auth ──────────────────────────────────────────────────────────────────

  async signIn(email: string, password: string) {
    const data = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    return { user: data.user };
  },

  async signOut() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
  },

  async getCurrentUser() {
    try {
      const data = await api('/api/auth/user');
      return (data.user ?? data) ?? null;
    } catch { return null; }
  },

  async resetPassword(_email: string) {},
  async changePassword(_newPassword: string) {},
  async resetAdminAccess(_email: string, _password: string) { return ''; },

  // ── Perfil do aluno ───────────────────────────────────────────────────────

  async getStudentProfile(_userId: string) {
    try {
      const { profile } = await api('/api/hub/me');
      return profile;
    } catch { return null; }
  },

  async updateStudentProfile(id: string, profile: any) {
    return { id, ...profile };
  },

  async getStudentEnrollments(userId: string) {
    try {
      const enrollment = await api(`/api/hub/admin/students/${userId}/enrollment`);
      return enrollment ? [enrollment] : [];
    } catch { return []; }
  },

  async getStudentEnrollmentByUid(uid: string) {
    try {
      return await api(`/api/hub/admin/students/${uid}/enrollment`) ?? null;
    } catch { return null; }
  },

  async upsertStudentEnrollment(uid: string, d: any) {
    return api(`/api/hub/admin/students/${uid}/enrollment`, {
      method: 'POST',
      body: JSON.stringify({
        module: d.module_title ?? d.module,
        moduleSlug: d.module_slug ?? d.moduleSlug,
        status: d.status ?? 'Ativo',
        progress: d.progress ?? 0,
      }),
    });
  },

  async getStudentActivity(_userId: string) { return []; },

  // ── Mensagens ─────────────────────────────────────────────────────────────

  async getStudentMessages(uid: string) {
    try { return await api(`/api/hub/admin/students/${uid}/messages`); } catch { return []; }
  },

  async createStudentMessage(uid: string, message: { title: string; body: string }) {
    return api('/api/hub/admin/messages', { method: 'POST', body: JSON.stringify({ studentId: uid, ...message }) });
  },

  async markStudentMessageRead(id: string) {
    return api(`/api/hub/me/messages/${id}/read`, { method: 'PATCH' });
  },

  async deleteStudentMessage(id: string) {
    return api(`/api/hub/admin/messages/${id}`, { method: 'DELETE' });
  },

  // ── Financeiro ────────────────────────────────────────────────────────────

  async getStudentInvoices(uid: string) {
    try { return await api(`/api/hub/admin/students/${uid}/invoices`); } catch { return []; }
  },

  async createStudentInvoice(uid: string, invoice: any) {
    return api('/api/hub/admin/invoices', { method: 'POST', body: JSON.stringify({ studentId: uid, ...invoice }) });
  },

  async updateStudentInvoiceStatus(id: string, status: string) {
    return api(`/api/hub/admin/invoices/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
  },
  async deleteStudentInvoice(id: string) {
    return api(`/api/hub/admin/invoices/${id}`, { method: 'DELETE' });
  },

  // ── Suporte ───────────────────────────────────────────────────────────────

  async createSupportTicket(_uid: string, ticket: any) {
    return api('/api/hub/me/support', { method: 'POST', body: JSON.stringify(ticket) });
  },

  async getStudentSupportTickets(_uid: string) {
    try { return await api('/api/hub/me/support'); } catch { return []; }
  },

  async updateSupportTicket(id: string, data: any) {
    return api(`/api/hub/admin/support/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
  },

  // ── Agenda ────────────────────────────────────────────────────────────────

  async getStudentAgenda(uid: string) {
    try { return await api(`/api/hub/admin/students/${uid}/agenda`); } catch { return []; }
  },

  async createAgendaItem(uid: string, item: any) {
    return api(`/api/hub/admin/students/${uid}/agenda`, { method: 'POST', body: JSON.stringify(item) });
  },

  // ── Admin: alunos ─────────────────────────────────────────────────────────

  async getAllStudents() {
    try {
      const rows = await api('/api/hub/admin/students');
      return rows.map((s: any) => ({
        ...s,
        name: s.fullName ?? s.email ?? 'Aluno',
        avatar: s.avatarUrl ?? `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.fullName ?? s.email ?? 'A')}`,
      }));
    } catch { return []; }
  },

  async getAllActivity() { return []; },
  async deleteStudent(id: string) {
    return api(`/api/hub/admin/students/${id}`, { method: 'DELETE' });
  },

  async deleteStudentAccount(id: string) {
    return api(`/api/hub/admin/students/${id}`, { method: 'DELETE' });
  },

  async createStudentAccount(d: { full_name: string; email: string; password: string; module_title: string; module_slug: string }) {
    const data = await api('/api/hub/admin/students', {
      method: 'POST',
      body: JSON.stringify({ full_name: d.full_name, email: d.email, password: d.password }),
    });
    return { uid: data.id, email: data.email };
  },

  async getDirectors() {
    try { return await api('/api/hub/admin/directors'); } catch { return []; }
  },

  async getDiretores() {
    try { return await api('/api/hub/admin/diretores'); } catch { return []; }
  },

  async searchUsers(email: string) {
    try { return await api(`/api/hub/admin/users/search?email=${encodeURIComponent(email)}`); } catch { return []; }
  },

  async changeUserRole(uid: string, role: string, status?: string) {
    return api(`/api/hub/admin/users/${uid}/role`, {
      method: 'PATCH',
      body: JSON.stringify(status ? { role, status } : { role }),
    });
  },

  async uploadAvatar(_uid: string, _file: File): Promise<string> { return ''; },

  // ── Admin: configurações do site ──────────────────────────────────────────

  async updateSettings(settings: any) {
    return api('/api/hub/admin/settings', { method: 'PUT', body: JSON.stringify(settings) });
  },

  async getSettings() {
    try { return await api('/api/hub/admin/settings'); } catch { return {}; }
  },

  // ── Admin: banners ────────────────────────────────────────────────────────

  async getBanners() {
    try { return await api('/api/hub/admin/banners'); } catch { return []; }
  },
  async createBanner(b: any) { return api('/api/hub/admin/banners', { method: 'POST', body: JSON.stringify(b) }); },
  async updateBanner(id: number, b: any) { return api(`/api/hub/admin/banners/${id}`, { method: 'PATCH', body: JSON.stringify(b) }); },
  async deleteBanner(id: number) { return api(`/api/hub/admin/banners/${id}`, { method: 'DELETE' }); },

  // ── Admin: módulos ────────────────────────────────────────────────────────

  async getModules() {
    try { return await api('/api/hub/admin/modules'); } catch { return []; }
  },
  async createModule(m: any) { return api('/api/hub/admin/modules', { method: 'POST', body: JSON.stringify(m) }); },
  async updateModule(id: number, m: any) { return api(`/api/hub/admin/modules/${id}`, { method: 'PATCH', body: JSON.stringify(m) }); },
  async deleteModule(id: number) { return api(`/api/hub/admin/modules/${id}`, { method: 'DELETE' }); },

  // ── Admin: professores ────────────────────────────────────────────────────

  async getTeachers() {
    try { return await api('/api/hub/admin/teachers'); } catch { return []; }
  },
  async createTeacher(t: any) { return api('/api/hub/admin/teachers', { method: 'POST', body: JSON.stringify(t) }); },
  async updateTeacher(id: number, t: any) { return api(`/api/hub/admin/teachers/${id}`, { method: 'PATCH', body: JSON.stringify(t) }); },
  async deleteTeacher(id: number) { return api(`/api/hub/admin/teachers/${id}`, { method: 'DELETE' }); },

  // ── Admin: FAQs ───────────────────────────────────────────────────────────

  async getFAQs() {
    try { return await api('/api/hub/admin/faqs'); } catch { return []; }
  },
  async createFAQ(f: any) { return api('/api/hub/admin/faqs', { method: 'POST', body: JSON.stringify(f) }); },
  async updateFAQ(id: number, f: any) { return api(`/api/hub/admin/faqs/${id}`, { method: 'PATCH', body: JSON.stringify(f) }); },
  async deleteFAQ(id: number) { return api(`/api/hub/admin/faqs/${id}`, { method: 'DELETE' }); },

  // ── Admin: depoimentos ────────────────────────────────────────────────────

  async getTestimonials() {
    try { return await api('/api/hub/admin/testimonials'); } catch { return []; }
  },
  async createTestimonial(t: any) { return api('/api/hub/admin/testimonials', { method: 'POST', body: JSON.stringify(t) }); },
  async updateTestimonial(id: number, t: any) { return api(`/api/hub/admin/testimonials/${id}`, { method: 'PATCH', body: JSON.stringify(t) }); },
  async deleteTestimonial(id: number) { return api(`/api/hub/admin/testimonials/${id}`, { method: 'DELETE' }); },

  // ── Admin: learnings ──────────────────────────────────────────────────────

  async getLearnings() { return []; },
  async createLearning(_l: any) {},
  async updateLearning(_id: number, _l: any) {},
  async deleteLearning(_id: number) {},

  // ── Aliases e métodos usados por StudentDashboard / AdminPanel ────────────

  async getAgendaItems(uid: string) {
    try { return await api(`/api/hub/admin/students/${uid}/agenda`); } catch { return []; }
  },

  async deleteAgendaItem(id: string) {
    return api(`/api/hub/admin/agenda/${id}`, { method: 'DELETE' });
  },

  async getNotices(_uid?: string) {
    try { return await api('/api/hub/notices'); } catch { return []; }
  },
  async createNotice(notice: { title: string; body: string }) {
    return api('/api/hub/admin/notices', { method: 'POST', body: JSON.stringify(notice) });
  },
  async deleteNotice(id: string) {
    return api(`/api/hub/admin/notices/${id}`, { method: 'DELETE' });
  },

  async getSupportTickets(uid: string) {
    try { return await api(`/api/hub/admin/students/${uid}/support`); } catch { return []; }
  },

  async getAllSupportTickets() {
    try { return await api('/api/hub/admin/support'); } catch { return []; }
  },

  async deleteSupportTicket(_id: string) {},

  async seedDatabase(_data?: any) {},
};

export const supabaseService = firebaseService;
