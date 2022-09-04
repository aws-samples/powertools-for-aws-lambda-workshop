import { useState, useRef, useCallback } from "react";
import { API } from "aws-amplify";
import { Flex, Card, Loader } from "@aws-amplify/ui-react";
import { useDropzone } from "react-dropzone";
import axios from "axios";

const fileReader = new FileReader();

const getFileFromInput = (file: File): Promise<any> => {
  return new Promise(function (resolve, reject) {
    fileReader.onerror = reject;
    fileReader.onload = function () {
      resolve(fileReader.result);
    };
    fileReader.readAsBinaryString(file); // here the file can be read in different way Text, DataUrl, ArrayBuffer
  });
};

const getPresignedUrl = async (file: File): Promise<string> => {
  try {
    const res = await API.get("main", "/get-presigned-url", {
      queryStringParameters: {
        type: file.type,
      },
    });
    return res.data;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

const upload = async (
  uploadUrl: string,
  file: File,
  onUploadProgress: (e: any) => void
) => {
  const blob = await getFileFromInput(file);
  try {
    axios.put(uploadUrl, blob, {
      headers: {
        "Content-Type": file.type,
      },
      onUploadProgress,
    });
  } catch (err) {
    console.error(err);
  } finally {
  }
};

function App() {
  const [progress, setProgress] = useState(0);

  const onUploadProgress = useCallback((progressEvent: any): void => {
    var percentCompleted = Math.round(
      (progressEvent.loaded * 100) / progressEvent.total
    );
    setProgress(percentCompleted);
  }, []);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setProgress(0);
    const url = await getPresignedUrl(acceptedFiles[0]);
    await upload(url, acceptedFiles[0], onUploadProgress);
  }, []);
  const { getRootProps, getInputProps, isDragActive, acceptedFiles } =
    useDropzone({ onDrop });

  return (
    <Flex width={"100vw"} height={"100vh"} direction={"column"}>
      {acceptedFiles.map((file: File) => (
        <span key={file.name}>
          {file.name} - {progress}
        </span>
      ))}
      <Card
        as="div"
        backgroundColor="var(--amplify-colors-white)"
        borderRadius="var(--amplify-radii-medium)"
        border={`2px dashed var(--amplify-colors-${
          isDragActive ? "blue-60" : "black"
        })`}
        // boxShadow="3px 3px 5px 6px var(--amplify-colors-neutral-60)"
        color="var(--amplify-colors-blue-60)"
        maxWidth="100%"
        width="20rem"
        {...getRootProps()}
      >
        <input {...getInputProps()} />
        {isDragActive ? (
          <p>Drop the files here ...</p>
        ) : (
          <p>Drag 'n' drop some files here, or click to select files</p>
        )}
      </Card>
    </Flex>
  );
}

export default App;
