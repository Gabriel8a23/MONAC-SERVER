'use strict';
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

/**
 * order controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::order.order', ({ strapi }) => ({
  async create(ctx) {
    const {
      orderId,
      products,
      userName,
      email,
      shippingAddress,
      billingAddress,
      phoneNumber
    } = ctx.request.body

    try {
      const  lineItems = await Promise.all(
        products.map(async (product) => {
          const item = await strapi
            .service("api::item.item")
            .findOne(product.id)
          
            return {
              price_data: {
                currency: "mxn",
                product_data: {
                  name: item.name
                },
                unit_amount: item.price * 100,
              },
              quantity: product.count
            }
        })
      )

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        customer_email: email,
        mode: "payment",
        success_url: `http://localhost:3000/checkout/success/${orderId}`,
        cancel_url: "http://localhost:3000",
        line_items: lineItems
      })

      await strapi.service("api::order.order").create({
        data: {
          billingAddress,
          email,
          userName,
          products,
          stripeSessionId: session.id,
          orderId,
          shippingAddress,
          phoneNumber
        }
      })

      return { id: session.id }
    } catch (error) {
      ctx.response.status = 500
      return { error: { message: error.message } }
    }
  }
}));
