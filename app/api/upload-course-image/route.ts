import { NextRequest, NextResponse } from "next/server";

const GITHUB_API = "https://api.github.com";

function getConfig() {
  const token = process.env.GITHUB_TOKEN;
  const username = process.env.GITHUB_USERNAME;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";

  if (!token || !username || !repo) {
    throw new Error(
      "Missing GitHub configuration. Check GITHUB_TOKEN, GITHUB_USERNAME and GITHUB_REPO in .env.local."
    );
  }

  return {
    token,
    username,
    repo,
    branch,
  };
}

function githubHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function POST(request: NextRequest) {
  try {
    const { token, username, repo, branch } = getConfig();

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No image file was provided." },
        { status: 400 }
      );
    }

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid image type. Please upload JPG, PNG, WEBP or GIF.",
        },
        { status: 400 }
      );
    }

    // Keep course images reasonably small.
    const MAX_SIZE = 5 * 1024 * 1024;

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        {
          error: "Image is too large. Maximum size is 5 MB.",
        },
        { status: 400 }
      );
    }

    const originalName = file.name || "course-image";
    const safeFileName = originalName
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-");

    const path = `course-images/${Date.now()}-${safeFileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const content = buffer.toString("base64");

    const githubUrl = `${GITHUB_API}/repos/${username}/${repo}/contents/${encodeURIComponent(
      path
    )}`;

    const response = await fetch(githubUrl, {
      method: "PUT",
      headers: {
        ...githubHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Upload course image: ${safeFileName}`,
        content,
        branch,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("GitHub upload error:", data);

      return NextResponse.json(
        {
          error:
            data?.message ||
            `GitHub upload failed with status ${response.status}.`,
        },
        { status: response.status }
      );
    }

    const rawUrl = `https://raw.githubusercontent.com/${username}/${repo}/${branch}/${path}`;

    return NextResponse.json({
      success: true,
      url: rawUrl,
      path,
    });
  } catch (error) {
    console.error("Course image upload error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to upload course image.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { token, username, repo, branch } = getConfig();

    const body = await request.json();
    const path = body?.path;

    if (!path || typeof path !== "string") {
      return NextResponse.json(
        { error: "Image path is required." },
        { status: 400 }
      );
    }

    // Only allow deletion of files uploaded by this endpoint.
    if (!path.startsWith("course-images/")) {
      return NextResponse.json(
        { error: "Invalid image path." },
        { status: 400 }
      );
    }

    const githubUrl = `${GITHUB_API}/repos/${username}/${repo}/contents/${encodeURIComponent(
      path
    )}?ref=${encodeURIComponent(branch)}`;

    const getFileResponse = await fetch(githubUrl, {
      method: "GET",
      headers: githubHeaders(token),
    });

    if (getFileResponse.status === 404) {
      return NextResponse.json({
        success: true,
        message: "Image was already deleted or does not exist.",
      });
    }

    const fileData = await getFileResponse.json();

    if (!getFileResponse.ok) {
      return NextResponse.json(
        {
          error:
            fileData?.message ||
            "Failed to find image on GitHub.",
        },
        { status: getFileResponse.status }
      );
    }

    const deleteResponse = await fetch(githubUrl, {
      method: "DELETE",
      headers: {
        ...githubHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `Delete course image: ${path}`,
        sha: fileData.sha,
        branch,
      }),
    });

    const deleteData = await deleteResponse.json();

    if (!deleteResponse.ok) {
      return NextResponse.json(
        {
          error:
            deleteData?.message ||
            "Failed to delete image from GitHub.",
        },
        { status: deleteResponse.status }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Course image deletion error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete course image.",
      },
      { status: 500 }
    );
  }
}