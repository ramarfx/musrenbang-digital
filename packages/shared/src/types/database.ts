import type { ApbdItem, ApbdSeed } from '../schemas/apbd';
import type { Category } from '../schemas/category';
import type { Comment, CommentRow, VoteRow } from '../schemas/comment';
import type { ConfigRow } from '../schemas/config';
import type { GapItem } from '../schemas/gap';
import type { Profile } from '../schemas/profile';
import type { AdminStats, PublicStats } from '../schemas/stats';
import type {
  Proposal,
  ProposalRow,
  ProposalSeed,
  StatusHistory,
  StatusHistoryRow,
} from '../schemas/proposal';

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type TableDefinition<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

type ViewDefinition<Row> = {
  Row: Row;
  Relationships: [];
};

type FunctionDefinition<Args, Returns> = {
  Args: Args;
  Returns: Returns;
};

type ProfileInsert = {
  id: string;
  email: string;
  nama: string;
  peran?: Profile['peran'];
};

type ProposalInsert = {
  judul: string;
  deskripsi: string;
  kategori: string;
  lokasi?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  estimasi_biaya: number;
  pengusul_id?: string | null;
  status?: ProposalRow['status'];
  moderasi?: ProposalRow['moderasi'];
  catatan_moderasi?: string | null;
  dimoderasi_oleh?: string | null;
  dimoderasi_pada?: string | null;
};

type ProposalUpdate = Partial<ProposalInsert>;

type StatusHistoryInsert = {
  proposal_id: number;
  status_lama?: string | null;
  status_baru: string;
  diubah_oleh?: string | null;
  catatan?: string | null;
};

type CommentInsert = {
  proposal_id: number;
  user_id: string;
  isi: string;
};

type AllocationInsert = {
  user_id: string;
  kategori: string;
  jumlah?: number;
};

type ApbdInsert = ApbdSeed;

/**
 * Tipe database manual yang mengikuti migrasi di supabase/migrations.
 * Bila skema berubah, perbarui berkas ini bersama migrasinya. Bentuknya
 * kompatibel dengan createClient<Database>() dari supabase-js.
 */
export type Database = {
  public: {
    Tables: {
      profiles: TableDefinition<Profile, ProfileInsert, Partial<ProfileInsert>>;
      categories: TableDefinition<Category, { nama: string }, { nama?: string }>;
      apbd_items: TableDefinition<ApbdItem, ApbdInsert, Partial<ApbdSeed>>;
      proposals: TableDefinition<ProposalRow, ProposalInsert, ProposalUpdate>;
      proposal_status_history: TableDefinition<
        StatusHistoryRow,
        StatusHistoryInsert,
        Record<string, never>
      >;
      votes: TableDefinition<
        VoteRow,
        { user_id: string; proposal_id: number },
        Record<string, never>
      >;
      comments: TableDefinition<CommentRow, CommentInsert, Record<string, never>>;
      allocations: TableDefinition<
        { user_id: string; kategori: string; jumlah: number; diubah_pada: string },
        AllocationInsert,
        { jumlah?: number }
      >;
      priority_rankings: TableDefinition<
        { user_id: string; kategori: string; posisi: number },
        never,
        never
      >;
      config: TableDefinition<ConfigRow, ConfigRow, { nilai?: string }>;
    };
    Views: {
      v_gap: ViewDefinition<GapItem>;
      v_proposals: ViewDefinition<Proposal>;
      v_comments: ViewDefinition<Comment>;
      v_proposal_status_history: ViewDefinition<StatusHistory>;
      v_public_stats: ViewDefinition<PublicStats>;
      v_admin_stats: ViewDefinition<AdminStats>;
    };
    Functions: {
      moderate_proposal: FunctionDefinition<
        { p_proposal_id: number; p_moderasi: string; p_catatan?: string | null },
        undefined
      >;
      save_allocations: FunctionDefinition<{ p_rows: Json }, undefined>;
      save_priority_rankings: FunctionDefinition<{ p_rows: Json }, undefined>;
      get_priority_rankings: FunctionDefinition<
        Record<string, never>,
        { kategori: string; posisi: number }[]
      >;
      get_priority_ranking_summary: FunctionDefinition<
        Record<string, never>,
        { kategori: string; skor: number; jumlah_partisipan: number }[]
      >;
      change_proposal_status: FunctionDefinition<
        { p_proposal_id: number; p_status: string },
        undefined
      >;
      change_proposal_status_with_note: FunctionDefinition<
        { p_proposal_id: number; p_status: string; p_catatan: string },
        undefined
      >;
      is_admin: FunctionDefinition<Record<string, never>, boolean>;
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** Tipe baris seed yang sudah divalidasi, untuk dipakai skrip seed. */
export type SeedProposal = ProposalSeed;
export type SeedApbd = ApbdSeed;
