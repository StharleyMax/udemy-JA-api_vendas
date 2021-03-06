import AppError from '@shared/errors/appError';
import { getCustomRepository } from 'typeorm';
import { OrdersRepository } from '../typeorm/repositories/OrdersRepository';
import CustomersRepository from '@modules/customers/typeorm/repositories/CustomersRepository';
import { ProductRepository } from '@modules/products/typeorm/repositories/ProductsRepository';
import Order from '../typeorm/entities/Order';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

class CreateOrderService {
  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const ordersRepository = getCustomRepository(OrdersRepository);
    const customerRepository = getCustomRepository(CustomersRepository);
    const productsRepository = getCustomRepository(ProductRepository);

    const customerExist = await customerRepository.findById(customer_id);

    if (!customerExist) {
      throw new AppError('Could not find customer with the given id.');
    }

    const existsProducts = await productsRepository.findAllByIds(products);

    if (!existsProducts.length) {
      throw new AppError('Could not find any products with the given ids');
    }

    const existsProductsIds = existsProducts.map(product => product.id);

    const checkInexiststentProducts = products.filter(
      product => !existsProductsIds.includes(product.id),
    );

    if (checkInexiststentProducts.length) {
      throw new AppError(
        ` Could not find product ${checkInexiststentProducts[0].id}`,
      );
    }
    const quantityAvailable = products.filter(
      product =>
        existsProducts.filter(p => p.id == product.id)[0].quantity <
        product.quantity,
    );

    if (quantityAvailable.length) {
      throw new AppError(
        `the quantity ${quantityAvailable[0].quantity}
         is not available for ${quantityAvailable[0].id} `,
      );
    }

    const serializedProducts = products.map(product => ({
      product_id: product.id,
      quantity: product.quantity,
      price: existsProducts.filter(p => p.id == product.id)[0].price,
    }));
    const order = await ordersRepository.create({
      customer: customerExist,
      order_products: serializedProducts,
    });

    await ordersRepository.save(order);

    const { order_products } = order;

    const updatedProductQuantity = order_products.map(product => ({
      id: product.product_id,
      quantity:
        existsProducts.filter(p => p.id === product.product_id)[0].quantity -
        product.quantity,
    }));

    await productsRepository.save(updatedProductQuantity);

    return order;
  }
}

export default CreateOrderService;
