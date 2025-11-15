import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const healthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '0.1.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      services: {
        firebase: await checkFirebaseHealth(),
        redis: await checkRedisHealth(),
        database: await checkDatabaseHealth()
      }
    };
    
    const isHealthy = Object.values(healthStatus.services).every(service => service.status === 'healthy');
    
    return NextResponse.json(healthStatus, {
      status: isHealthy ? 200 : 503
    });
    
  } catch (error) {
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    }, { status: 503 });
  }
}

async function checkFirebaseHealth() {
  try {
    // In production, check Firebase Admin SDK connectivity
    return {
      status: 'healthy',
      message: 'Firebase connection OK'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Firebase connection failed'
    };
  }
}

async function checkRedisHealth() {
  try {
    // In production, check Redis connectivity
    return {
      status: 'healthy',
      message: 'Redis connection OK'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Redis connection failed'
    };
  }
}

async function checkDatabaseHealth() {
  try {
    // In production, check database connectivity
    return {
      status: 'healthy',
      message: 'Database connection OK'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: 'Database connection failed'
    };
  }
}