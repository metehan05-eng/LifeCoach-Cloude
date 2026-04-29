import { prismaClient } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'E-posta ve şifre zorunludur.' });
    }

    // Check if user exists
    const existingUser = await prismaClient.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Bu e-posta adresi zaten kullanımda.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prismaClient.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    return res.status(201).json({ 
      message: 'Kayıt başarılı.', 
      user: { id: user.id, email: user.email, name: user.name } 
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: 'Bir hata oluştu.', error: error.message });
  }
}
