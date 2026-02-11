/**
 * Admin Emails Controller
 * Email template management should be handled through a separate system or migrated to Sequelize.
 */

const disabledResponse = {
  success: false,
  message: 'Email template management is currently unavailable.',
};

export const listAll = async (req, res) => {
  return res.status(501).json(disabledResponse);
};

export const getOne = async (req, res) => {
  return res.status(501).json(disabledResponse);
};

export const create = async (req, res) => {
  return res.status(501).json(disabledResponse);
};

export const update = async (req, res) => {
  return res.status(501).json(disabledResponse);
};

export const deleteTemplate = async (req, res) => {
  return res.status(501).json(disabledResponse);
};

export const preview = async (req, res) => {
  return res.status(501).json(disabledResponse);
};

export const sendTest = async (req, res) => {
  return res.status(501).json(disabledResponse);
};

// Legacy aliases
export const listTemplates = listAll;
export const getTemplate = getOne;
export const updateTemplate = update;
export const sendTestEmail = sendTest;
export const getEmailLogs = async (req, res) => {
  return res.status(501).json(disabledResponse);
};
