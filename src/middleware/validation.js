const { body, validationResult } = require('express-validator');

class ValidationError extends Error {
  constructor(errors) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const validationError = new ValidationError(errors.mapped());
    return next(validationError);
  }
  next();
};

const quickAnswerValidation = [
  body('ai_chat')
    .isBoolean()
    .withMessage('The ai_chat field must be a boolean (true or false).'),
  
  body('user_query')
    .if(body('ai_chat').equals(true))
    .trim()
    .notEmpty()
    .withMessage('The user_query field is required when ai_chat is true.')
    .isLength({ max: 5000 })
    .withMessage('The user_query field must not exceed 5000 characters.'),
  
  body('conversation')
    .if(body('ai_chat').equals(false))
    .trim()
    .notEmpty()
    .withMessage('The conversation field is required when ai_chat is false.')
    .isLength({ max: 10000 })
    .withMessage('The conversation field must not exceed 10000 characters.'),
  
  handleValidationErrors
];

const discoValidation = [
  body('conversation')
    .trim()
    .notEmpty()
    .withMessage('The conversation field is required.'),
  
  body('context')
    .optional()
    .isObject()
    .withMessage('The context field must be an object.'),
  
  body('context.type')
    .optional()
    .trim()
    .isString()
    .withMessage('The context.type field must be a string.'),
  
  body('context.currentDISCO')
    .optional()
    .isObject()
    .withMessage('The context.currentDISCO field must be an object.'),
  
  body('context.currentDISCO.Decision_Criteria')
    .optional()
    .custom((value) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          return true; // Allow arrays
        }
        if (typeof value === 'string') {
          return true; // Allow strings
        }
        return false;
      }
      return true; // Allow undefined/null
    })
    .withMessage('The Decision_Criteria field must be a string or array.'),
  
  body('context.currentDISCO.Impact')
    .optional()
    .custom((value) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          return true; // Allow arrays
        }
        if (typeof value === 'string') {
          return true; // Allow strings
        }
        return false;
      }
      return true; // Allow undefined/null
    })
    .withMessage('The Impact field must be a string or array.'),
  
  body('context.currentDISCO.Situation')
    .optional()
    .custom((value) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          return true; // Allow arrays
        }
        if (typeof value === 'string') {
          return true; // Allow strings
        }
        return false;
      }
      return true; // Allow undefined/null
    })
    .withMessage('The Situation field must be a string or array.'),
  
  body('context.currentDISCO.Challenges')
    .optional()
    .custom((value) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          return true; // Allow arrays
        }
        if (typeof value === 'string') {
          return true; // Allow strings
        }
        return false;
      }
      return true; // Allow undefined/null
    })
    .withMessage('The Challenges field must be a string or array.'),
  
  body('context.currentDISCO.Objectives')
    .optional()
    .custom((value) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          return true; // Allow arrays
        }
        if (typeof value === 'string') {
          return true; // Allow strings
        }
        return false;
      }
      return true; // Allow undefined/null
    })
    .withMessage('The Objectives field must be a string or array.'),
  
  handleValidationErrors
];

const ephemeralKeyValidation = [
  body('voice')
    .optional()
    .trim()
    .isIn(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'])
    .withMessage('The voice field must be one of: alloy, echo, fable, onyx, nova, shimmer.'),
  
  handleValidationErrors
];

module.exports = {
  quickAnswerValidation,
  discoValidation,
  ephemeralKeyValidation,
  ValidationError
}; 