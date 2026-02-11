import db from '../models/index.js';
import { getPayPalAccessToken, isPayPalConfigured } from '../config/paypal.js';

const { Vendor, VendorPayout } = db;

/**
 * Create a payout via PayPal Payouts API
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const createPayPalPayout = async (req, res) => {
  try {
    const { vendorId, amount, notes } = req.body;

    // Validate required fields
    if (!vendorId || !amount) {
      return res.status(400).json({ message: 'Vendor ID and amount are required' });
    }

    // Check if PayPal is configured
    if (!isPayPalConfigured()) {
      return res.status(503).json({
        message: 'PayPal Payouts API is not configured. Use manual payout marking instead.',
      });
    }

    // Get vendor
    const vendor = await Vendor.findByPk(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Validate PayPal email
    if (!vendor.paypalEmail) {
      return res.status(400).json({
        message: 'Vendor does not have a PayPal email configured',
      });
    }

    // Validate available balance
    const availableBalance = parseFloat(vendor.balanceAvailable || 0);
    const payoutAmount = parseFloat(amount);

    if (payoutAmount > availableBalance) {
      return res.status(400).json({
        message: `Insufficient balance. Available: $${availableBalance.toFixed(2)}, Requested: $${payoutAmount.toFixed(2)}`,
      });
    }

    if (payoutAmount <= 0) {
      return res.status(400).json({ message: 'Payout amount must be greater than 0' });
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Create payout batch
    const payoutBatch = {
      sender_batch_header: {
        sender_batch_id: `payout_${Date.now()}_${vendorId}`,
        email_subject: 'You have a payout from Ageless Literature',
        email_message: notes || 'Your earnings payout has been processed.',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: payoutAmount.toFixed(2),
            currency: 'USD',
          },
          receiver: vendor.paypalEmail,
          note: notes || 'Vendor earnings payout',
          sender_item_id: `${vendorId}_${Date.now()}`,
        },
      ],
    };

    // Send payout request to PayPal
    const response = await fetch('https://api-m.paypal.com/v1/payments/payouts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payoutBatch),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('PayPal payout failed:', result);
      return res.status(response.status).json({
        message: 'PayPal payout failed',
        error: result.message || 'Unknown error',
      });
    }

    // Update vendor balance
    vendor.balanceAvailable = (availableBalance - payoutAmount).toFixed(2);
    vendor.balancePaid = (parseFloat(vendor.balancePaid || 0) + payoutAmount).toFixed(2);
    await vendor.save();

    // Record payout in database
    const payout = await VendorPayout.create({
      vendorId: vendor.id,
      amount: payoutAmount,
      method: 'paypal',
      status: 'pending', // PayPal batch is processing
      transactionId: result.batch_header.payout_batch_id,
      metadata: {
        batch_id: result.batch_header.payout_batch_id,
        batch_status: result.batch_header.batch_status,
        paypal_email: vendor.paypalEmail,
        sender_batch_id: payoutBatch.sender_batch_header.sender_batch_id,
      },
      notes: notes || '',
      processedAt: new Date(),
      processedBy: req.user.id,
    });

    res.status(200).json({
      message: 'PayPal payout initiated successfully',
      payout,
      paypalBatchId: result.batch_header.payout_batch_id,
      batchStatus: result.batch_header.batch_status,
    });
  } catch (error) {
    console.error('PayPal payout error:', error);
    res.status(500).json({
      message: 'Failed to create PayPal payout',
      error: error.message,
    });
  }
};

/**
 * Manually record a PayPal payout (for when API is not configured)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const recordManualPayPalPayout = async (req, res) => {
  try {
    const { vendorId, amount, transactionId, notes } = req.body;

    // Validate required fields
    if (!vendorId || !amount) {
      return res.status(400).json({ message: 'Vendor ID and amount are required' });
    }

    // Get vendor
    const vendor = await Vendor.findByPk(vendorId);
    if (!vendor) {
      return res.status(404).json({ message: 'Vendor not found' });
    }

    // Validate available balance
    const availableBalance = parseFloat(vendor.balanceAvailable || 0);
    const payoutAmount = parseFloat(amount);

    if (payoutAmount > availableBalance) {
      return res.status(400).json({
        message: `Insufficient balance. Available: $${availableBalance.toFixed(2)}, Requested: $${payoutAmount.toFixed(2)}`,
      });
    }

    if (payoutAmount <= 0) {
      return res.status(400).json({ message: 'Payout amount must be greater than 0' });
    }

    // Update vendor balance
    vendor.balanceAvailable = (availableBalance - payoutAmount).toFixed(2);
    vendor.balancePaid = (parseFloat(vendor.balancePaid || 0) + payoutAmount).toFixed(2);
    await vendor.save();

    // Record payout in database
    const payout = await VendorPayout.create({
      vendorId: vendor.id,
      amount: payoutAmount,
      method: 'paypal',
      status: 'completed', // Manual marking is immediately completed
      transactionId: transactionId || null,
      metadata: {
        manual: true,
        paypal_email: vendor.paypalEmail,
        marked_by: req.user.email || req.user.id,
      },
      notes: notes || 'Manually recorded PayPal payout',
      processedAt: new Date(),
      processedBy: req.user.id,
    });

    res.status(200).json({
      message: 'Manual PayPal payout recorded successfully',
      payout,
    });
  } catch (error) {
    console.error('Manual payout recording error:', error);
    res.status(500).json({
      message: 'Failed to record manual payout',
      error: error.message,
    });
  }
};

/**
 * Check PayPal payout batch status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const checkPayPalPayoutStatus = async (req, res) => {
  try {
    const { batchId } = req.params;

    if (!batchId) {
      return res.status(400).json({ message: 'Batch ID is required' });
    }

    // Check if PayPal is configured
    if (!isPayPalConfigured()) {
      return res.status(503).json({
        message: 'PayPal Payouts API is not configured',
      });
    }

    // Get PayPal access token
    const accessToken = await getPayPalAccessToken();

    // Get batch status from PayPal
    const response = await fetch(`https://api-m.paypal.com/v1/payments/payouts/${batchId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('PayPal batch status check failed:', result);
      return res.status(response.status).json({
        message: 'Failed to check batch status',
        error: result.message || 'Unknown error',
      });
    }

    // Update payout status in database if completed
    const batchStatus = result.batch_header.batch_status;
    if (batchStatus === 'SUCCESS' || batchStatus === 'COMPLETED') {
      await VendorPayout.update(
        { status: 'completed' },
        {
          where: {
            transactionId: batchId,
            status: 'pending',
          },
        },
      );
    } else if (batchStatus === 'DENIED' || batchStatus === 'CANCELED') {
      await VendorPayout.update(
        { status: 'failed' },
        {
          where: {
            transactionId: batchId,
            status: 'pending',
          },
        },
      );
    }

    res.status(200).json({
      batchId,
      batchStatus,
      details: result,
    });
  } catch (error) {
    console.error('PayPal status check error:', error);
    res.status(500).json({
      message: 'Failed to check payout status',
      error: error.message,
    });
  }
};
