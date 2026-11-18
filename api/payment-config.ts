import { getUaaCycleContext } from '../shared/examCycle.js';
import { EXAM_SOURCES_SNAPSHOT } from '../shared/examSources.js';
import { getServerCatalog } from './_catalog.js';
import { type ApiRequest, type ApiResponse } from './_security.js';

export default function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const stripeEnabled = Boolean((process.env.STRIPE_SECRET_KEY || '').trim());
  const accessCodeEnabled = Boolean((process.env.KIT_ACCESS_CODES || '').trim());
  const catalog = getServerCatalog();
  const examCycle = getUaaCycleContext();

  return res.status(200).json({
    stripeEnabled,
    accessCodeEnabled,
    products: Object.values(catalog),
    examCycle: {
      editionMonthYear: examCycle.editionMonthYear,
      targetAdmissionYear: examCycle.targetAdmissionYear,
      editionLabel: examCycle.editionLabel,
      uaaPhaseLabel: examCycle.uaaPhaseLabel,
    },
    examSources: {
      lastSyncedIso: EXAM_SOURCES_SNAPSHOT.lastSyncedIso,
      lastSyncedLabel: EXAM_SOURCES_SNAPSHOT.lastSyncedLabel,
      officialUrls: EXAM_SOURCES_SNAPSHOT.officialUrls,
    },
  });
}
