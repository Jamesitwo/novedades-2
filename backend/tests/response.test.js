const { handlePrismaError } = require('../src/utils/response');

describe('handlePrismaError', () => {
  it('should map P2002 to 409 DUPLICATE', () => {
    const result = handlePrismaError({ code: 'P2002', meta: { target: 'email' } });
    expect(result).toEqual({ status: 409, code: 'DUPLICATE', message: 'El email ya existe' });
  });

  it('should map P2025 to 404 NOT_FOUND', () => {
    const result = handlePrismaError({ code: 'P2025' });
    expect(result.status).toBe(404);
    expect(result.code).toBe('NOT_FOUND');
  });

  it('should map P2003 to 400 FOREIGN_KEY', () => {
    const result = handlePrismaError({ code: 'P2003' });
    expect(result.status).toBe(400);
    expect(result.code).toBe('FOREIGN_KEY');
  });

  it('should return 500 for unknown errors', () => {
    const result = handlePrismaError({ code: 'UNKNOWN' });
    expect(result.status).toBe(500);
    expect(result.code).toBe('INTERNAL');
  });
});
