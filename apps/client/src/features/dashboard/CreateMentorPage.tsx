import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export const CreateMentorPage = () => {
	const navigate = useNavigate();

	useEffect(() => {
		navigate("/users/create");
	}, [navigate]);

	return null;
};
