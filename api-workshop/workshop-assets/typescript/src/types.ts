export type OrderItem = {
  name: string;
  quantity: number;
};

export type Order = {
  orderId: string;
  customerName: string;
  restaurantName: string;
  orderItems: OrderItem[];
  orderDate: string;
  orderStatus: string;
  restaurantId?: number;
};
