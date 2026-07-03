import { getPrisma } from '../../lib/prisma.js';
import { NotFoundError } from '../../lib/errors.js';
import type { CreateArticleInput, UpdateArticleInput } from './knowledge-articles.schema.js';

export async function listArticles(params: {
  q?: string; tag?: string; reasonCode?: string; rootCauseCode?: string; page?: number; limit?: number;
}) {
  const prisma = getPrisma();
  const page = params.page ?? 1;
  const limit = params.limit ?? 20;
  const where: any = { deletedAt: null };
  if (params.reasonCode) where.reasonCode = params.reasonCode;
  if (params.rootCauseCode) where.rootCauseCode = params.rootCauseCode;
  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: 'insensitive' } },
      { symptoms: { contains: params.q, mode: 'insensitive' } },
      { cause: { contains: params.q, mode: 'insensitive' } },
      { resolution: { contains: params.q, mode: 'insensitive' } },
    ];
  }
  const [total, data] = await Promise.all([
    prisma.knowledgeArticle.count({ where }),
    prisma.knowledgeArticle.findMany({ where, orderBy: { updatedAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
  ]);
  // tag filter applied in-memory since tags is a JSON array column (not directly queryable across all providers)
  const filtered = params.tag ? data.filter((a: any) => Array.isArray(a.tags) && a.tags.includes(params.tag)) : data;
  return { data: filtered, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function getArticleById(id: string) {
  const prisma = getPrisma();
  const article = await prisma.knowledgeArticle.findFirst({ where: { id, deletedAt: null } });
  if (!article) throw new NotFoundError('Knowledge article', id);
  return article;
}

export async function createArticle(input: CreateArticleInput & { createdBy?: string }) {
  const prisma = getPrisma();
  return prisma.knowledgeArticle.create({
    data: {
      title: input.title,
      symptoms: input.symptoms,
      cause: input.cause,
      resolution: input.resolution,
      verification: input.verification,
      tags: input.tags ?? [],
      reasonCode: input.reasonCode,
      rootCauseCode: input.rootCauseCode,
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
    },
  });
}

export async function updateArticle(id: string, input: UpdateArticleInput & { updatedBy?: string }) {
  await getArticleById(id);
  const prisma = getPrisma();
  return prisma.knowledgeArticle.update({
    where: { id },
    data: { ...input, updatedBy: input.updatedBy },
  });
}

export async function deleteArticle(id: string) {
  await getArticleById(id);
  const prisma = getPrisma();
  await prisma.knowledgeArticle.update({ where: { id }, data: { deletedAt: new Date() } });
}

// Used by the Incident detail view to suggest articles matching the incident's reason/root cause.
export async function getRelatedArticles(params: { reasonCode?: string; rootCauseCode?: string }) {
  const prisma = getPrisma();
  if (!params.reasonCode && !params.rootCauseCode) return [];
  const where: any = {
    deletedAt: null,
    isActive: true,
    OR: [
      ...(params.reasonCode ? [{ reasonCode: params.reasonCode }] : []),
      ...(params.rootCauseCode ? [{ rootCauseCode: params.rootCauseCode }] : []),
    ],
  };
  return prisma.knowledgeArticle.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 5 });
}
