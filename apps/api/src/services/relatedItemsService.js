/**
 * Related Items Service
 */

import db from '../models/index.js';
import { Op } from 'sequelize';

const { Book, Product, Vendor, BookMedia, Category, Auction } = db;

export async function getRelatedItems(itemId, itemType, options = {}) {
  const { productLimit = 12, auctionLimit = 12 } = options;
  const Model = itemType === 'book' ? Book : Product;

  const currentItem = await Model.findByPk(itemId, {
    include: [
      {
        model: Category,
        as: 'categories',
        attributes: ['id', 'name'],
        through: { attributes: [] },
      },
      { model: Vendor, as: 'vendor', attributes: ['id', 'shopName'] },
    ],
  });

  if (!currentItem) throw new Error('Item not found');

  const categoryIds = currentItem.categories?.map((c) => c.id) || [];

  const productCandidates = await Model.findAll({
    where: {
      id: { [Op.ne]: itemId },
      status: 'published',
      quantity: { [Op.gt]: 0 },
      auctionLockedUntil: { [Op.or]: [{ [Op.is]: null }, { [Op.lt]: new Date() }] },
    },
    include: [
      {
        model: Category,
        as: 'categories',
        attributes: ['id', 'name'],
        through: { attributes: [] },
        required: false,
      },
      { model: Vendor, as: 'vendor', attributes: ['id', 'shopName', 'shopUrl', 'logoUrl'] },
      ...(itemType === 'book'
        ? [
            {
              model: BookMedia,
              as: 'media',
              attributes: ['imageUrl', 'thumbnailUrl', 'isPrimary'],
              required: false,
            },
          ]
        : []),
    ],
    limit: 200,
    order: [['views', 'DESC']],
  });

  const auctions = await Auction.findAll({
    where: {
      auctionableType: itemType === 'book' ? 'book' : 'product',
      status: { [Op.in]: ['active', 'upcoming'] },
      endDate: { [Op.gt]: new Date() },
    },
    include: [{ model: Vendor, as: 'vendor', attributes: ['id', 'shopName', 'shopUrl'] }],
    limit: 100,
  });

  const auctionableIds = auctions.map((a) => a.auctionableId).filter((id) => id != itemId);
  const auctionItems = await Model.findAll({
    where: { id: { [Op.in]: auctionableIds }, status: 'published' },
    include: [
      {
        model: Category,
        as: 'categories',
        attributes: ['id', 'name'],
        through: { attributes: [] },
        required: false,
      },
      { model: Vendor, as: 'vendor', attributes: ['id', 'shopName', 'shopUrl', 'logoUrl'] },
      ...(itemType === 'book'
        ? [
            {
              model: BookMedia,
              as: 'media',
              attributes: ['imageUrl', 'thumbnailUrl', 'isPrimary'],
              required: false,
            },
          ]
        : []),
    ],
  });

  const scoreItem = (item) => {
    let score = 0;
    const itemCats = item.categories?.map((c) => c.id) || [];
    const sharedCats = categoryIds.filter((id) => itemCats.includes(id));
    score += sharedCats.length * 40;
    if (currentItem.author && item.author && currentItem.author === item.author) score += 25;
    if (currentItem.artist && item.artist && currentItem.artist === item.artist) score += 25;
    return score;
  };

  const scoredProducts = productCandidates
    .map((item) => ({ item, score: scoreItem(item) }))
    .sort((a, b) => b.score - a.score);
  const scoredAuctions = auctionItems
    .map((item) => {
      const auction = auctions.find((a) => a.auctionableId == item.id);
      return { item, auction, score: scoreItem(item) };
    })
    .sort((a, b) => b.score - a.score);

  const formatProduct = (item) => {
    const formatted = item.toJSON();
    if (!formatted.primaryImage && formatted.media?.length > 0) {
      const primaryMedia = formatted.media.find((m) => m.isPrimary) || formatted.media[0];
      formatted.primaryImage = primaryMedia.thumbnailUrl || primaryMedia.imageUrl;
    }
    return formatted;
  };

  const formatAuction = (item, auction) => {
    const formatted = formatProduct(item);
    formatted.auction = {
      id: auction.id,
      startingPrice: auction.startingPrice || auction.startingBid,
      currentBid: auction.currentBid,
      bidCount: auction.bidCount || 0,
      startsAt: auction.startsAt || auction.startDate,
      endsAt: auction.endsAt || auction.endDate,
      status: auction.status,
    };
    formatted.hasActiveAuction = true;
    return formatted;
  };

  return {
    products: scoredProducts.slice(0, productLimit).map((sp) => formatProduct(sp.item)),
    auctions: scoredAuctions.slice(0, auctionLimit).map((sa) => formatAuction(sa.item, sa.auction)),
  };
}

export default { getRelatedItems };
