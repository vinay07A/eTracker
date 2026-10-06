/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.up = function (knex) {
    return knex.schema.createTable('expenses', function (table) {
        table.increments('id').primary();
        table.string('title').notNullable();
        table.float('amount').notNullable();
        table.string('date').notNullable();
        table.string('category').notNullable();
        table.timestamps(true, true);
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists('expenses');
};