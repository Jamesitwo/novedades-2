const paginate = (data, total, page, limit) => {
  return {
    data,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
      hasNextPage: parseInt(page) * parseInt(limit) < total,
      hasPrevPage: parseInt(page) > 1
    }
  };
};

module.exports = { paginate };