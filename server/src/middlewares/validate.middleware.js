// Generic validation middleware that takes a Zod schema
const validate = (schema, source = 'body') => {
    return (req, res, next) => {
        const data = source === 'query' ? req.query : source === 'params' ? req.params : req.body;
        const result = schema.safeParse(data);

        if (!result.success) {
            const errors = result.error.errors.map((e) => ({
                field: e.path.join('.'),
                message: e.message,
            }));
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors,
            });
        }

        // Attach parsed and coerced data back to request
        if (source === 'query') req.validatedQuery = result.data;
        else if (source === 'params') req.validatedParams = result.data;
        else req.body = result.data;

        next();
    };
};

export default validate;
