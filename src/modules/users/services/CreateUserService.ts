import AppError from '@shared/errors/appError';
import { getCustomRepository } from 'typeorm';
import UsersRepository from '../typeorm/repositories/UsersRepository';
import User from '../typeorm/entities/User';
import { hash } from 'bcryptjs';

interface IRequest {
  name: string;
  email: string;
  password: string;
}

class CreateUserService {
  public async execute({ name, email, password }: IRequest): Promise<User> {
    const usersRepository = getCustomRepository(UsersRepository);
    const emailExist = await usersRepository.findByEmail(email);

    if (emailExist) {
      throw new AppError('Email address already used');
    }

    const hashPassword = await hash(password, 8);

    const user = usersRepository.create({
      name,
      email,
      password: hashPassword,
    });

    await usersRepository.save(user);

    return user;
  }
}

export default CreateUserService;
