-- Migration: add 'pesapal' as a valid payment_method for payments
-- This aligns the database with the PesaPal-based payment flow in the server.
-- Run this against the same MySQL database used by the Konektika server.

USE konektika;

ALTER TABLE payments
  MODIFY COLUMN payment_method ENUM(
    'mobile_money',
    'bank_card',
    'crypto',
    'airtel_money',
    'tigo_pesa',
    'vodacom_mpesa',
    'pesapal'
  ) NOT NULL;
