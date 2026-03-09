const { ZodError } = require('zod');

/**
 * Middleware para validar el cuerpo de la petición (req.body) usando un esquema Zod.
 * @param {import('zod').ZodObject} schema 
 */
const validateBody = (schema) => {
    return (req, res, next) => {
        try {
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const errorMessages = error.errors.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
                return res.status(400).json({ error: 'Errores de validación', detalles: errorMessages });
            }
            res.status(500).json({ error: 'Error interno de validación' });
        }
    };
};

module.exports = { validateBody };
