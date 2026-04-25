import { SupabaseClient } from '@supabase/supabase-js'

export enum ClientType {
  SERVER = 'server',
  SPA = 'spa',
}

export class SassClient {
  private client: SupabaseClient
  private clientType: ClientType

  constructor(client: SupabaseClient, clientType: ClientType) {
    this.client = client
    this.clientType = clientType
  }

  async loginEmail(email: string, password: string) {
    return this.client.auth.signInWithPassword({ email, password })
  }

  async registerEmail(email: string, password: string) {
    return this.client.auth.signUp({ email, password })
  }

  async exchangeCodeForSession(code: string) {
    return this.client.auth.exchangeCodeForSession(code)
  }

  async resendVerificationEmail(email: string) {
    return this.client.auth.resend({ email, type: 'signup' })
  }

  async logout() {
    const { error } = await this.client.auth.signOut({ scope: 'local' })
    if (error) throw error
    if (this.clientType === ClientType.SPA) window.location.href = '/auth/login'
  }

  async uploadFile(myId: string, filename: string, file: File) {
    filename = filename.replace(/[^0-9a-zA-Z!\-_.*'()]/g, '_')
    return this.client.storage.from('files').upload(`${myId}/${filename}`, file)
  }

  async getFiles(myId: string) {
    return this.client.storage.from('files').list(myId)
  }

  async deleteFile(myId: string, filename: string) {
    return this.client.storage.from('files').remove([`${myId}/${filename}`])
  }

  async shareFile(myId: string, filename: string, timeInSec: number, forDownload = false) {
    return this.client.storage.from('files').createSignedUrl(`${myId}/${filename}`, timeInSec, { download: forDownload })
  }

  async getMyTodoList(page = 1, pageSize = 100, order = 'created_at', done: boolean | null = false) {
    let query = this.client.from('todo_list').select('*').range(page * pageSize - pageSize, page * pageSize - 1).order(order)
    if (done !== null) query = query.eq('done', done)
    return query
  }

  async createTask(row: Record<string, unknown>) {
    return this.client.from('todo_list').insert(row)
  }

  async removeTask(id: number) {
    return this.client.from('todo_list').delete().eq('id', id)
  }

  async updateAsDone(id: number) {
    return this.client.from('todo_list').update({ done: true }).eq('id', id)
  }

  getSupabaseClient() {
    return this.client
  }
}
