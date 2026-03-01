import crypto from 'crypto';

interface TransloaditFile {
  name: string;
  url: string;
  size: number;
  type: string;
}

interface TransloaditUploadResponse {
  ok: true;
  results: {
    [key: string]: Array<{
      name: string;
      url: string;
      size: number;
      type: string;
    }>;
  };
}

interface TransloaditError {
  ok: false;
  error: string;
  message?: string;
}

/**
 * Create a signed Transloadit params object
 */
function createTransloaditSignature(
  params: Record<string, any>,
  secret: string
): { params: string; signature: string } {
  const paramsJson = JSON.stringify(params);
  const paramsBase64 = Buffer.from(paramsJson).toString('base64');
  const signature = crypto
    .createHmac('sha1', secret)
    .update(paramsBase64)
    .digest('hex');
  return { params: paramsBase64, signature };
}

/**
 * Upload a file buffer to Transloadit
 */
export async function uploadToTransloadit(
  fileBuffer: Buffer,
  fileName: string,
  fileType: 'image' | 'video'
): Promise<string> {
  const key = process.env.TRANSLOADIT_KEY;
  const secret = process.env.TRANSLOADIT_SECRET;

  if (!key || !secret) {
    throw new Error(
      'Transloadit credentials missing: TRANSLOADIT_KEY and TRANSLOADIT_SECRET required'
    );
  }

  // Create assembly steps for file upload
  const params = {
    auth: {
      key: key,
    },
    steps: {
      upload: {
        robot: '/http/import',
        result: true,
      },
    },
  };

  const { params: paramsBase64, signature } = createTransloaditSignature(
    params,
    secret
  );

  const formData = new FormData();
  formData.append('params', paramsBase64);
  formData.append('signature', signature);
  formData.append('file', new Blob([Buffer.from(fileBuffer)], { type: `${fileType}/*` }), fileName);

  try {
    const response = await fetch('https://api2.transloadit.com/assemblies', {
      method: 'POST',
      body: formData,
    });

    const data = (await response.json()) as
      | TransloaditUploadResponse
      | TransloaditError;

    if (!data.ok) {
      const errorMsg = 'error' in data ? data.error : 'Unknown error';
      throw new Error(`Transloadit upload failed: ${errorMsg}`);
    }

    // Get the uploaded file URL from results
    const uploadResults = data.results?.upload?.[0];
    if (!uploadResults?.url) {
      throw new Error('No URL returned from Transloadit');
    }

    return uploadResults.url;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Transloadit upload error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Create a Transloadit video processing assembly
 * Returns assembly URL for polling results
 */
export async function createTransloaditVideoAssembly(
  videoUrl: string,
  steps: Record<string, any> = {}
): Promise<{
  assemblyId: string;
  assemblyUrl: string;
}> {
  const key = process.env.TRANSLOADIT_KEY;
  const secret = process.env.TRANSLOADIT_SECRET;

  if (!key || !secret) {
    throw new Error(
      'Transloadit credentials missing: TRANSLOADIT_KEY and TRANSLOADIT_SECRET required'
    );
  }

  const defaultSteps = {
    import: {
      robot: '/http/import',
      url: videoUrl,
    },
    export: {
      robot: '/file/store',
      use: 'import',
      path: 'processed/${file.name}',
    },
    ...steps,
  };

  const params = {
    auth: {
      key: key,
    },
    steps: defaultSteps,
  };

  const { params: paramsBase64, signature } = createTransloaditSignature(
    params,
    secret
  );

  try {
    const response = await fetch('https://api2.transloadit.com/assemblies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        params: paramsBase64,
        signature: signature,
      }).toString(),
    });

    const data = (await response.json()) as any;

    if (data.error) {
      throw new Error(`Transloadit assembly creation failed: ${data.error}`);
    }

    return {
      assemblyId: data.assembly_id,
      assemblyUrl: data.assembly_url,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Transloadit assembly error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Poll for Transloadit assembly completion
 */
export async function pollTransloaditAssembly(
  assemblyUrl: string,
  maxAttempts: number = 60,
  delayMs: number = 1000
): Promise<{
  ok: boolean;
  results: Record<string, any[]>;
  error?: string;
}> {
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(assemblyUrl);
      const data = (await response.json()) as any;

      if (data.ok) {
        return {
          ok: true,
          results: data.results,
        };
      }

      if (data.error && data.error !== 'REQUEST_IN_PROGRESS') {
        return {
          ok: false,
          results: {},
          error: data.error,
        };
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      attempts++;
    } catch (error) {
      if (error instanceof Error) {
        return {
          ok: false,
          results: {},
          error: error.message,
        };
      }
      throw error;
    }
  }

  return {
    ok: false,
    results: {},
    error: 'Assembly polling timeout',
  };
}
